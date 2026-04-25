---
name: hierarchical-bsq-codebook-quantization
description: Quantize continuous vectors into hierarchical discrete tokens via Binary Spherical Quantization with a high-bit "pre" head and a low-bit "post" head.
category: ml-ops
tags: [quantization, bsq, vq-vae, codebook, hierarchical-tokens, tokenizer]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/module.py, model/kronos.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Hierarchical BSQ: split a wide code into two vocabularies (s1, s2)

## When to use
- You need a discrete tokenizer over a large effective vocabulary (e.g. 20 bits = ~1M codes) but a single softmax over 2^20 is too big for the downstream LM.
- You have multivariate continuous features (OHLCV, IMU vectors, embeddings) and want a faithful bit-level quantization without training an explicit codebook.
- You want differentiable straight-through quantization without EMA codebook maintenance.

## Pattern
BSQ represents each vector as a sign pattern on a normalized sphere: `zhat = sign(z)` with a straight-through gradient, scaled by `1/sqrt(codebook_dim)`. The integer index is the packed bitmask. To avoid a 2^K softmax in the AR head, the `codebook_dim = s1_bits + s2_bits` is split: high bits form a coarse token (`s1`, vocab `2^s1_bits`) and low bits form a fine token (`s2`, vocab `2^s2_bits`). The LM predicts s1 first, then s2 conditioned on s1.

```python
# model/module.py
class BinarySphericalQuantizer(nn.Module):
    def quantize(self, z):
        zhat = torch.where(z > 0, 1.0, -1.0)
        return z + (zhat - z).detach()           # straight-through estimator

class BSQuantizer(nn.Module):
    def forward(self, z, half=False, collect_metrics=True):
        z = F.normalize(z, dim=-1)               # project onto unit sphere
        quantized, bsq_loss, metrics = self.bsq(z, collect_metrics=collect_metrics)
        if half:                                 # split into two heads
            q_pre  = quantized[:, :, :self.s1_bits]
            q_post = quantized[:, :, self.s1_bits:]
            return bsq_loss, quantized, [self.bits_to_indices(q_pre),
                                         self.bits_to_indices(q_post)]
        return bsq_loss, quantized, self.bits_to_indices(quantized)
```

## Why it works / tradeoffs
Splitting a 2^K vocabulary into (2^s1) x (2^s2) turns one huge softmax into two small ones; predicting `s2 | s1` preserves the joint distribution at a fraction of the memory. The BSQ loss combines a commit term (pull `z` toward the quantized lattice point) with an entropy penalty (`gamma0`, `gamma`, `zeta` hyperparams) that spreads usage across the codebook. Tradeoff: bit ordering carries no semantics, so the split must be balanced and the LM must learn the conditional relationship.

## References
- `model/module.py` in Kronos — `BinarySphericalQuantizer`, `BSQuantizer`
- `model/kronos.py` — `KronosTokenizer.encode/decode`, `half=True` usage
- BSQ paper: https://arxiv.org/abs/2406.07548
