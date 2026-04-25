---
name: two-stage-tokenizer-then-autoregressive-transformer
description: Quantize continuous multi-variate time series into discrete tokens first, then train an autoregressive transformer over those tokens.
category: ml-ops
tags: [foundation-model, time-series, tokenizer, autoregressive, transformer, two-stage]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, model/module.py, finetune/train_tokenizer.py, finetune/train_predictor.py, README.md]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Two-stage pipeline: tokenize continuous signal, then autoregress on tokens

## When to use
- You want to apply LLM-style foundation models to continuous, multi-variate sequences (OHLCV candles, sensor streams, multivariate telemetry).
- Raw values are noisy, unbounded, or have different scales per channel — cross-entropy on a discrete vocab is more stable than regressing floats.
- You want to reuse the Hugging Face / Transformer ecosystem (sampling, temperature, top-p) on non-text data.

## Pattern
Stage 1: a small encoder–decoder tokenizer learns to compress each time-step vector into a discrete token (via a quantizer such as BSQ / VQ-VAE). Train with reconstruction loss + quantizer loss. Freeze when good enough.

Stage 2: a causal decoder-only Transformer is pretrained on the token stream with standard next-token cross-entropy. Inference runs AR sampling, then the tokenizer's decoder maps the predicted tokens back to continuous values.

```python
# Stage 1 forward (model/kronos.py KronosTokenizer)
z = self.embed(x)                     # (B, T, d_model)
for layer in self.encoder: z = layer(z)
z = self.quant_embed(z)               # (B, T, codebook_dim)
bsq_loss, quantized, z_indices = self.tokenizer(z)
z = self.post_quant_embed(quantized)
for layer in self.decoder: z = layer(z)
z = self.head(z)                      # reconstruction in input space

# Stage 1 loss (finetune/train_tokenizer.py)
recon = F.mse_loss(z, batch_x)
loss = (recon + bsq_loss) / 2

# Stage 2 training reads frozen tokenizer (finetune/train_predictor.py)
with torch.no_grad():
    token_seq_0, token_seq_1 = tokenizer.encode(batch_x, half=True)
logits = model(token_seq_0[:, :-1], token_seq_1[:, :-1], stamp=batch_x_stamp[:, :-1])
loss, _, _ = model.module.head.compute_loss(logits[0], logits[1],
                                            token_seq_0[:, 1:], token_seq_1[:, 1:])
```

## Why it works / tradeoffs
Decoupling representation learning from sequence modeling lets each stage use its natural loss: MSE + quantizer regularizers for the codec, cross-entropy for the language model. It also lets you scale stages independently — e.g. Kronos ships a 2M-param tokenizer with models ranging 4M to 500M. Cost: two training runs, two checkpoints, and information lost at quantization bounds tokenizer-step generalization.

## References
- `model/kronos.py` in Kronos — `KronosTokenizer`, `Kronos`, `auto_regressive_inference`
- `finetune/train_tokenizer.py`, `finetune/train_predictor.py`
- Kronos paper: https://arxiv.org/abs/2508.02739
