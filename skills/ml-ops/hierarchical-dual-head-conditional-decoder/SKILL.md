---
name: hierarchical-dual-head-conditional-decoder
description: At each AR step, sample a coarse (s1) token from the transformer output, then sample the fine (s2) token conditioned on a cross-attention over the s1 embedding.
category: ml-ops
tags: [autoregressive, dual-head, hierarchical-decoding, cross-attention, tokenizer-head]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, model/module.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Dual-head AR: predict coarse token, then fine token given coarse

## When to use
- Your discrete vocabulary is too big for a single softmax (≥ 2^15) — e.g. hierarchical VQ / BSQ / residual-VQ tokens.
- You can split the code into "most significant bits" (s1) and "least significant bits" (s2) such that predicting s1 first and s2 conditioned on s1 factorizes the joint cleanly.
- You want to use teacher forcing during training but honest sampling at inference.

## Pattern
Keep one `transformer` stack over the fused embedding of `(s1, s2)`. The main head produces logits for s1. Build `sibling_embed` either from the ground-truth s1 (teacher forcing) or by multinomial-sampling the current step's s1 from the detached logits. Run a cross-attention layer (`DependencyAwareLayer`) that attends `sibling_embed` (query) over the transformer output (key/value), and push the result through a second projection to get s2 logits. At inference, decode s1 and s2 step-by-step with two matched sampling calls.

```python
# model/kronos.py Kronos.forward (training)
x = self.embedding([s1_ids, s2_ids]) + self.time_emb(stamp)
for layer in self.transformer: x = layer(x, key_padding_mask=padding_mask)
x = self.norm(x)

s1_logits = self.head(x)                                             # [B, T, 2^s1_bits]
if use_teacher_forcing:
    sibling_embed = self.embedding.emb_s1(s1_targets)
else:
    s1_probs      = F.softmax(s1_logits.detach(), dim=-1)
    sample_s1_ids = torch.multinomial(s1_probs.view(-1, V), 1).view(s1_ids.shape)
    sibling_embed = self.embedding.emb_s1(sample_s1_ids)

x2        = self.dep_layer(x, sibling_embed, key_padding_mask=padding_mask)  # cross-attn
s2_logits = self.head.cond_forward(x2)                               # [B, T, 2^s2_bits]

# model/kronos.py auto_regressive_inference (inference)
s1_logits, context = model.decode_s1(pre_buf, post_buf, stamp)
sample_pre  = sample_from_logits(s1_logits[:, -1, :], T=T, top_p=top_p, top_k=top_k)
s2_logits   = model.decode_s2(context, sample_pre)
sample_post = sample_from_logits(s2_logits[:, -1, :], T=T, top_p=top_p, top_k=top_k)
```

## Why it works / tradeoffs
One 2^20 softmax becomes a 2^10 + 2^10 pair — far less memory and logit matmul. The conditional on s1 keeps the joint `p(s1, s2 | x)` well-modeled because s2 has the information that s1 alone lacks, via cross-attention to the sibling embedding. Teacher forcing on the training path speeds convergence; sampling s1 at eval mirrors the inference scheme so the train/eval distribution stays matched. Tradeoff: two sequential sampling calls per step — doubles latency in pure Python loops. If `s1_bits == s2_bits == 10`, you get a 2^20 effective vocab for the cost of two 2^10 heads.

## References
- `model/kronos.py` in Kronos — `Kronos.forward`, `Kronos.decode_s1`, `Kronos.decode_s2`, `auto_regressive_inference`
- `model/module.py` — `DependencyAwareLayer` (cross-attn fusion), `DualHead` (two projections `proj_s1`, `proj_s2`), `HierarchicalEmbedding.split_token`
