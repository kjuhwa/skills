---
name: mlx-kv-cache-rollback-on-reject
description: Roll back target-model KV cache after rejected speculative tokens, including GatedDeltaNet (non-trimmable) layers, by capturing per-layer inputs and replaying only the accepted prefix.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [speculative-decoding, kv-cache, mlx, gated-delta, state-rollback]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model_mlx.py
imported_at: 2026-04-18T00:00:00Z
---

# Rollback MLX KV Cache After Rejected Specs

## When to use
- You are doing speculative decoding on an MLX model that mixes standard `KVCache` / `RotatingKVCache` (trimmable) with state-space / linear-attention layers such as GatedDeltaNet (non-trimmable).
- You need to discard `trim = block_size - accepted - 1` tokens from every cache so the next block starts with a consistent state.
- Trimming works for attention-based layers, but SSM-like layers have no per-token slice — you must replay the last `accepted + 1` tokens' state update.

## Pattern

Two caches behave differently:
- **Trimmable** (`c.is_trimmable() == True`): call `trim_prompt_cache(cache, trim)` — cheap O(1) index adjustment.
- **Non-trimmable** GatedDeltaNet: intercept `__call__` to record `(q, k, v, a, b, A_log, dt_bias, state, mask)` per layer during the verify-forward. On reject, re-run `gated_delta_update` over only the accepted prefix and overwrite `cache.cache[1]`.

```python
class _GDNStateCapture:
    """Monkey-patches GatedDeltaNet.__call__ to record inputs, provides rollback()."""
    def __init__(self):
        self._gdn_inputs, self.conv_data = [], []
        _GDN_PATCH_LOCK.acquire()
        self._patch()          # replace class __call__ with capturing version

    def rollback(self, cache, accepted, trim):
        n_non_trim = sum(1 for c in cache if not c.is_trimmable())
        assert n_non_trim == len(self._gdn_inputs)
        j = 0
        for c in cache:
            if c.is_trimmable():
                c.trim(trim)
            else:
                q, k, v, a, b, A_log, dt_bias, init_state, mask = self._gdn_inputs[j]
                n = accepted + 1
                _, new_state = _gd_mod.gated_delta_update(
                    q[:, :n], k[:, :n], v[:, :n], a[:, :n], b[:, :n],
                    A_log, dt_bias, init_state,
                    None if mask is None else mask[:, :n],
                    use_kernel=True,
                )
                c.cache[1] = new_state
                conv_input, K = self.conv_data[j]
                c.cache[0] = conv_input[:, accepted + 1: accepted + K]
                j += 1

    def close(self):
        # Restore GatedDeltaNet.__call__, release the class-level lock.
        ...
```

## Driver loop

```python
_can_trim = can_trim_prompt_cache(target_cache)
_capture = _GDNStateCapture() if not _can_trim else None
try:
    while generating:
        if _capture is not None:
            _capture.clear()
        # ... verify target ...
        trim = block_size - accepted - 1
        if trim > 0:
            if _can_trim:
                trim_prompt_cache(target_cache, trim)
            else:
                _capture.rollback(target_cache, accepted, trim)
finally:
    if _capture is not None:
        _capture.close()
```

## Gotchas
- The capture patches a *class method*, so concurrent speculative decoders in the same process would collide. Guard with a module-level `RLock` and always `close()` in `finally`.
- The convolution 1-D state (`conv_data`) must also be re-sliced — tokens after `accepted + 1` pollute the convolution prefix.
- Assert `len(self._gdn_inputs) == n_non_trimmable` so a shape mismatch fails loudly rather than silently corrupting state.
- This is MLX-specific because `cache.cache[0]` / `cache.cache[1]` are the conv + state slots in MLX's GatedDeltaNet cache shape; PyTorch equivalents use different field names.
