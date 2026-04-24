---
name: block-speculative-decoding-loop
description: Block-level speculative decoding — draft a block of tokens from a small model, verify with the target model in one forward pass, accept the longest matching prefix + 1.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [speculative-decoding, block-diffusion, draft-model, inference, kv-cache]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model.py
imported_at: 2026-04-18T00:00:00Z
---

# Block Speculative Decoding Loop

## When to use
- You have a fast draft model and a slower target model and want to skip target-model steps.
- You want block-level (not token-level) speculation so you amortize target forward passes across `block_size` tokens.
- The draft model can consume masked positions and produce all `block_size - 1` proposed tokens in parallel.

## Core idea
Each iteration:
1. Fill a `block_size`-wide window starting at `start` with `[last_accepted_token, MASK, MASK, ...]`.
2. Draft model fills the masks → `draft_tokens`.
3. Target model runs once on the *entire* proposed block.
4. Accept the longest prefix where `proposed[i+1] == target_sampled[i]`; always take target's correction at position `accepted`.
5. Advance `start += accepted + 1`, trim draft KV cache back to `start`.

## Reference implementation (PyTorch)

```python
@torch.inference_mode()
def dflash_generate(draft, target, input_ids, max_new_tokens,
                    stop_token_ids, temperature, block_size, mask_token_id):
    num_input = input_ids.shape[1]
    max_len = num_input + max_new_tokens
    output_ids = torch.full((1, max_len + block_size), mask_token_id,
                            dtype=torch.long, device=target.device)
    output_ids[:, :num_input] = input_ids
    position_ids = torch.arange(output_ids.shape[1], device=target.device).unsqueeze(0)
    kv_target, kv_draft = DynamicCache(), DynamicCache()

    # Prefill target on the real prompt, sample first new token from it.
    out = target(input_ids, position_ids=position_ids[:, :num_input],
                 past_key_values=kv_target, use_cache=True, logits_to_keep=1,
                 output_hidden_states=block_size > 1)
    output_ids[:, num_input:num_input+1] = sample(out.logits, temperature)
    target_hidden = extract_context_feature(out.hidden_states, draft.target_layer_ids)

    start = num_input
    while start < max_len:
        block_tokens = output_ids[:, start:start+block_size].clone()
        block_pos    = position_ids[:, start:start+block_size]

        # Draft: propose tokens 1..block_size-1 from masked positions.
        noise_emb = target.model.embed_tokens(block_tokens)
        draft_logits = target.lm_head(draft(
            target_hidden=target_hidden,
            noise_embedding=noise_emb,
            position_ids=position_ids[:, kv_draft.get_seq_length(): start+block_size],
            past_key_values=kv_draft, use_cache=True, is_causal=False,
        )[:, 1 - block_size:, :])
        kv_draft.crop(start)                       # drop masked KVs; keep prefix
        block_tokens[:, 1:] = sample(draft_logits)

        # Verify: one target forward on the whole block.
        out = target(block_tokens, position_ids=block_pos,
                     past_key_values=kv_target, use_cache=True,
                     output_hidden_states=block_size > 1)
        posterior = sample(out.logits, temperature)

        # Accept longest matching prefix + 1 bonus token from target.
        accepted = (block_tokens[:, 1:] == posterior[:, :-1]).cumprod(dim=1).sum(dim=1)[0].item()
        output_ids[:, start:start+accepted+1] = block_tokens[:, :accepted+1]
        output_ids[:, start+accepted+1]       = posterior[:, accepted]
        start += accepted + 1
        kv_target.crop(start)                      # drop rejected tokens' KVs
        target_hidden = extract_context_feature(
            out.hidden_states, draft.target_layer_ids)[:, :accepted+1, :]

        if stop_token_ids and any(sid in output_ids[:, num_input:] for sid in stop_token_ids):
            break
    return output_ids[:, :min(start+1, max_len)]
```

## Gotchas
- `kv_draft.crop(start)` is mandatory: the masked positions' KVs are garbage and must be dropped before the next iteration.
- `is_causal=False` on the draft — the draft attends across the whole noise block plus target context, not a triangular mask.
- The `+ 1` bonus token at position `accepted` is sampled from the *target*, not the draft. This is what guarantees the decoded distribution matches the target at temperature 0.
- `target_hidden` must be cropped to `accepted + 1` positions — its caller next iteration expects it aligned with the final accepted prefix, not the full speculated block.
- When `block_size == 1` you degrade to standard autoregressive decoding; the `if block_size > 1` guards skip the draft entirely.
