---
name: temperature-topk-topp-logit-filter
description: Drop-in PyTorch helpers to apply temperature, top-k, and nucleus (top-p) filtering to logits before multinomial sampling.
category: inference
tags: [sampling, top-k, top-p, nucleus-sampling, temperature, decoding, transformer]
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

# Temperature + top-k + top-p logit filter before multinomial

## When to use
- You are decoding from any categorical distribution (LLM, token-level time series AR, VQ-VAE AR) and want knobs to trade determinism against diversity.
- You want a short, framework-agnostic function that returns one sampled index per row, with `top_k=1, top_p=1.0` degenerating cleanly to argmax.

## Pattern
Scale logits by `1/temperature`, apply top-k (zero-out everything below the k-th value) and/or top-p (zero-out the long tail beyond cumulative-prob threshold `p` on the sorted softmax), then softmax and `torch.multinomial`.

```python
# model/kronos.py
def top_k_top_p_filtering(logits, top_k=0, top_p=1.0, filter_value=-float("Inf"), min_tokens_to_keep=1):
    if top_k > 0:
        top_k = min(max(top_k, min_tokens_to_keep), logits.size(-1))
        indices_to_remove = logits < torch.topk(logits, top_k)[0][..., -1, None]
        logits[indices_to_remove] = filter_value
        return logits
    if top_p < 1.0:
        sorted_logits, sorted_indices = torch.sort(logits, descending=True)
        cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
        sorted_indices_to_remove = cumulative_probs > top_p
        if min_tokens_to_keep > 1:
            sorted_indices_to_remove[..., :min_tokens_to_keep] = 0
        sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
        sorted_indices_to_remove[..., 0] = 0
        indices_to_remove = sorted_indices_to_remove.scatter(1, sorted_indices, sorted_indices_to_remove)
        logits[indices_to_remove] = filter_value
        return logits

def sample_from_logits(logits, temperature=1.0, top_k=None, top_p=None, sample_logits=True):
    logits = logits / temperature
    if top_k is not None or top_p is not None:
        if top_k > 0 or top_p < 1.0:
            logits = top_k_top_p_filtering(logits, top_k=top_k, top_p=top_p)
    probs = F.softmax(logits, dim=-1)
    return torch.multinomial(probs, num_samples=1) if sample_logits else torch.topk(probs, k=1, dim=-1)[1]
```

## Why it works / tradeoffs
Top-k gives a hard cap on support size (constant speed); top-p adapts support to distribution sharpness. Running top-k first short-circuits the sort/cumsum when you don't need nucleus sampling. The "shift right" on `sorted_indices_to_remove` keeps the first token above the threshold in the keep set — a subtle off-by-one most naive implementations get wrong. For deterministic replay, set `top_k=1, top_p=1.0` and this collapses to argmax without a separate code path.

## References
- `model/kronos.py` in Kronos — `top_k_top_p_filtering`, `sample_from_logits`
- Nucleus sampling paper: Holtzman et al. https://arxiv.org/abs/1904.09751
- Original reference implementation: https://gist.github.com/thomwolf/1a5a29f6962089e871b94cbd09daf317
