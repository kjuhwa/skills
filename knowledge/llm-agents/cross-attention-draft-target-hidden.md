---
version: 0.1.0-draft
name: cross-attention-draft-target-hidden
summary: DFlash's draft attention concatenates K/V from the target's hidden states ("context") with K/V from the draft's own noise embeddings — so each draft query attends to the full target prefix plus the noisy block positions.
category: llm-agents
tags: [speculative-decoding, attention, cross-attention, dflash, draft-model]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model.py
imported_at: 2026-04-18T00:00:00Z
---

# Why DFlash's attention concatenates ctx + noise K/V

## The pattern

```python
# Inputs: hidden_states (draft positions, length q_len),
#         target_hidden (target ctx, length ctx_len)
q = self.q_proj(hidden_states)                    # Q from draft only
k_ctx, v_ctx = self.k_proj(target_hidden), self.v_proj(target_hidden)
k_noise, v_noise = self.k_proj(hidden_states), self.v_proj(hidden_states)
k = torch.cat([k_ctx, k_noise], dim=1)            # length = ctx_len + q_len
v = torch.cat([v_ctx, v_noise], dim=1)
# RoPE applied to k, q; draft attends to ALL ctx_len + q_len positions.
attn(q, k, v, is_causal=False)
```

## Why this shape, not "draft = causal self-attn"

- The draft is a *block*-wise generator, not autoregressive. Each of the `block_size` positions is simultaneously attending to the target context *and* to every other masked position in the block. `is_causal=False` enables intra-block bidirectional attention — that's what makes one forward produce all `block_size - 1` proposals jointly.
- Re-using the target's own `k_proj` / `v_proj` for the target hidden states means draft's attention head geometry is already "aligned" with the target — the draft inherits the target's attention inductive bias without extra parameters for the cross half.
- Separating `k_ctx` / `v_ctx` from `k_noise` / `v_noise` via concatenation (instead of running a real cross-attention sublayer) keeps the code path a single attention op. You pay one attention of size `q_len × (ctx_len + q_len)` per layer.

## Practical implications

- **KV cache** for the draft only stores `k_noise / v_noise` for the accepted prefix; target side is taken from `target_hidden`, which is re-extracted every iteration from the verify forward.
- `target_hidden` is cropped to `accepted + 1` after each verify step — if you forget to crop you'll both feed stale ctx positions *and* blow up the cache.
- RoPE is applied with `cos[..., -q_len:, :]` on Q and full `cos, sin` on K. The asymmetric indexing is because Q lives at the end of the concatenated window, so its rotary offsets differ from K's.

## Failure mode if you misimplement

- If you mistakenly mark `is_causal=True`, the draft degenerates to autoregressive and the speculative gains vanish — you are essentially running a small model token-by-token.
- If you use separate projections for context vs noise (`k_proj_ctx`, `k_proj_noise`), training is less stable and the draft size grows.
