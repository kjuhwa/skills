---
name: autoregressive-rolling-context-buffer
description: Generate beyond max_context by maintaining a fixed-size token ring buffer and rolling in each newly sampled token during autoregressive decoding.
category: inference
tags: [autoregressive, generation, ring-buffer, max-context, sliding-window, transformer]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Rolling max_context buffer for long autoregressive generation

## When to use
- You want to generate more tokens than the model's `max_context`, without KV-cache infrastructure.
- You need a deterministic memory footprint per step regardless of how long generation runs.
- You are calling a model that accepts a full token window (rather than an incremental-cached forward) and want to avoid allocating a new tensor on every step.

## Pattern
Pre-allocate a `(batch, max_context)` buffer filled with the initial history (or zero-padded if the prompt is shorter). Each step: slice the active window, call the model, sample the next token, and either write it at position `current_seq_len` (while the buffer isn't full) or `torch.roll(..., shifts=-1)` and overwrite the last slot. Keep a parallel `stamp` tensor aligned by the same windowing.

```python
# model/kronos.py auto_regressive_inference
pre_buffer  = x_token[0].new_zeros(batch_size, max_context)
post_buffer = x_token[1].new_zeros(batch_size, max_context)
buffer_len  = min(initial_seq_len, max_context)
start_idx   = max(0, initial_seq_len - max_context)
pre_buffer[:,  :buffer_len] = x_token[0][:, start_idx:start_idx + buffer_len]
post_buffer[:, :buffer_len] = x_token[1][:, start_idx:start_idx + buffer_len]

for i in range(pred_len):
    current_seq_len = initial_seq_len + i
    window_len      = min(current_seq_len, max_context)
    input_tokens    = [pre_buffer[:, :window_len], post_buffer[:, :window_len]]

    s1_logits, context = model.decode_s1(*input_tokens, current_stamp)
    sample_pre  = sample_from_logits(s1_logits[:, -1, :], ...)
    sample_post = sample_from_logits(model.decode_s2(context, sample_pre)[:, -1, :], ...)

    if current_seq_len < max_context:
        pre_buffer[:,  current_seq_len] = sample_pre.squeeze(-1)
        post_buffer[:, current_seq_len] = sample_post.squeeze(-1)
    else:
        pre_buffer.copy_(torch.roll(pre_buffer,  shifts=-1, dims=1))
        post_buffer.copy_(torch.roll(post_buffer, shifts=-1, dims=1))
        pre_buffer[:,  -1] = sample_pre.squeeze(-1)
        post_buffer[:, -1] = sample_post.squeeze(-1)
```

## Why it works / tradeoffs
Only one tensor of shape `(B, max_context)` is allocated per token stream for the entire generation, so GPU memory is bounded by `max_context`, not `max_context + pred_len`. The `torch.roll` in-place copy avoids re-indexing. Downside: each step still runs a full forward over the whole window — this pattern is complementary to, not a substitute for, KV caching. Useful when the model class does not yet expose cached decoding or when you want to keep inference code simple.

## References
- `model/kronos.py` in Kronos — function `auto_regressive_inference`
