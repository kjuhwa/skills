---
version: 0.1.0-draft
name: mlx-kv-cache-trimmability
summary: Which MLX KV caches support trim() and which don't — attention-based caches are trimmable by slicing; GatedDeltaNet state is not, and speculative decoding on Qwen3.5 MoE has to replay accepted inputs to roll back.
category: llm-agents
tags: [mlx, kv-cache, gated-delta, speculative-decoding, qwen3]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model_mlx.py
imported_at: 2026-04-18T00:00:00Z
---

# MLX KV cache: which layers are trimmable?

## The two worlds

MLX `mlx_lm` models use different per-layer cache shapes:

- **Attention layers** (`KVCache`, `RotatingKVCache`) — K and V are stored as contiguous arrays. Trimming `n` tokens is `arr = arr[:, :, :-n, :]` plus an offset decrement. `cache.is_trimmable() == True`.
- **Gated Delta Net / state-space layers** (Qwen3.5 MoE) — the state is a *recurrent summary*, not a window. You cannot slice off the last `n` tokens' contribution.
  - `cache.cache[0]` is the 1-D conv prefix (trimmable if you also remember the conv inputs).
  - `cache.cache[1]` is the SSM state — irreversibly fused; must be recomputed.
  - `cache.is_trimmable() == False`.

## Speculative decoding implications

If your target model is pure attention (e.g., Qwen3.5-4B, Qwen3.5-27B), `trim_prompt_cache(cache, n)` is all you need on reject.

If your target is Qwen3.5 MoE (`GatedDeltaNet` layers), you must:
1. Intercept `GatedDeltaNet.__call__` during the verify pass and capture `(q, k, v, a, b, A_log, dt_bias, state_before, mask)` per layer.
2. On reject (`trim = block_size - accepted - 1 > 0`), replay `gated_delta_update(q[:, :n], ..., state_before)` with `n = accepted + 1` and overwrite `cache.cache[1]` with the resulting state.
3. Reslice the conv cache `cache.cache[0] = conv_input[:, accepted+1 : accepted+K]`.
4. Trimmable layers still use `c.trim(trim)`; non-trimmable use the replay.

The DFlash MLX implementation guards against missing `gated_delta` support:

```python
_target_can_trim = can_trim_prompt_cache(target_cache)
if not _target_can_trim and not _HAS_GDN:
    raise RuntimeError(
        "This MLX model requires gated-delta rollback support, but "
        "mlx_lm.models.gated_delta is unavailable."
    )
```

## Testing your cache classification

```python
from mlx_lm.models.cache import can_trim_prompt_cache, make_prompt_cache
cache = make_prompt_cache(model)
print(can_trim_prompt_cache(cache))   # True → easy path
for c in cache:
    print(type(c).__name__, c.is_trimmable())
```

## Why this is MLX-specific
- PyTorch `DynamicCache` supports `.crop(n)` and stays trimmable across all layer types because PyTorch ports of Gated-Delta / Mamba typically store per-token states.
- MLX's `gated_delta` is an optional, fused C++ kernel — the Python wrapper exposes only the fused state, not per-token residuals, so rollback requires the replay pattern above.
