---
name: hidden-state-capture-layer-hook
description: Capture hidden states from specified transformer layers by wrapping them with a small proxy that records the output and forwards all other attribute access to the original layer.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [transformers, mlx, hidden-states, hooks, proxy-object]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model_mlx.py
imported_at: 2026-04-18T00:00:00Z
---

# Capture Hidden States via Layer Hook Wrapper

## When to use
- You need the outputs of specific transformer layers (by index) during a forward pass.
- The model does not expose `output_hidden_states=True` (e.g., MLX `mlx_lm` transformers) or you only want a few layers and cannot afford to materialize all of them.
- You want to patch the model once, then read captured states off `model._hidden_states` after each call — no callback plumbing.

## Pattern

```python
class _LayerHook:
    """Transparent proxy: run the layer, store output, forward getattr."""
    def __init__(self, layer, idx, storage):
        self._layer, self._idx, self._storage = layer, idx, storage

    def __call__(self, *args, **kwargs):
        self._storage[self._idx] = out = self._layer(*args, **kwargs)
        return out

    def __getattr__(self, name):
        # Anything not stored on the proxy (weights, parameters()) goes to the real layer.
        return getattr(self._layer, name)


def _patch_model(model, layer_ids):
    if hasattr(model, "_hidden_states"):
        return          # idempotent
    model._hidden_states = [None] * len(layer_ids)
    layers = _get_layers(model)
    for i, lid in enumerate(layer_ids):
        layers[lid] = _LayerHook(layers[lid], i, model._hidden_states)


def _get_layers(model):
    """Duck-type well-known wrapper paths."""
    for path in (lambda m: m.model.layers,
                 lambda m: m.language_model.layers,
                 lambda m: m.layers):
        try: return path(model)
        except AttributeError: continue
    raise AttributeError(f"Cannot find layers in {type(model).__name__}")
```

## Usage

```python
_patch_model(target_model, draft.config.target_layer_ids)
logits = target_model(prompt[None], cache)
hidden = mx.concatenate(target_model._hidden_states, axis=-1)
```

## Why a proxy instead of a forward hook
- Works with frameworks that have no `register_forward_hook` (MLX).
- Zero allocation cost beyond the list of outputs — the proxy is a thin wrapper.
- `__getattr__` delegation means `layers[lid].parameters()`, `layers[lid].weight`, etc., still work — so e.g. `model.save_weights()` continues to pick up the wrapped layer's parameters without knowing the wrapper exists.
- Idempotency guard (`hasattr(model, "_hidden_states")`) makes double-patching a no-op.

## Gotchas
- Storage is a plain `list`, not thread-safe; if you call the model concurrently, use a per-call storage or lock.
- The proxy sets `_layer`, `_idx`, `_storage` on itself; if the wrapped layer happens to have an attribute with the same name it will be shadowed. Prefix with `_` to reduce collision risk.
- Unpatching is not implemented; if you need to restore the layer, keep the original references you replaced and swap them back.
