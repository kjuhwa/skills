---
version: 0.1.0-draft
name: binary-spherical-quantization-bsq-overview
summary: BSQ replaces a learned VQ-VAE codebook with sign-quantization on a unit sphere — no codebook parameters, straight-through gradients, and a differentiable entropy regularizer.
category: design
tags: [bsq, quantization, vq-vae, codebook-free, straight-through-estimator, entropy-regularization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/module.py]
imported_at: 2026-04-18T00:00:00Z
---

# Binary Spherical Quantization — the codebook-free discrete bottleneck

**Paper:** Zhao et al., *Image and Video Tokenization with Binary Spherical Quantization*, 2024. https://arxiv.org/pdf/2406.07548.pdf

**The basic idea.** Traditional VQ-VAE maintains a large learned codebook matrix `(K, D)` and selects the nearest code via Euclidean distance. BSQ instead defines the codebook implicitly: the set of all `±1^D` vectors projected onto the unit sphere (scaled by `1/sqrt(D)`). The index of a code is just the packed sign bits. Training uses a **straight-through estimator**:

```
zhat = sign(z)                          # forward: binarize
z    = z + (zhat - z).detach()          # backward: identity gradient
```

This eliminates codebook parameters, avoids dead codes, and scales cleanly to `D = 20` (i.e. 2^20 = ~1M effective codes) without a big matmul at lookup.

**Loss function.** BSQ adds three regularizers on top of the downstream reconstruction loss:
- **Commit loss** `beta * |z - sg(zq)|^2` — pull the encoder output onto the lattice.
- **Per-sample entropy** `gamma0 * H(p_per_sample)` — encourage confident assignments per step.
- **Codebook entropy** `-gamma * H(p_codebook)` — encourage uniform usage across the whole codebook.

All three are wrapped by an overall `zeta` weight and an `inv_temperature` (`softmax` sharpness). Kronos uses the **soft entropy** approximation (Sec 3.2 of arXiv:1911.05894) where the codebook is partitioned into sub-codes of size `group_size`, keeping entropy tractable even when the full vocab is 2^20.

**Hierarchical splitting (Kronos's addition).** The raw BSQ code of `codebook_dim = s1_bits + s2_bits` bits is split into two indices: the top `s1_bits` form the coarse token, the bottom `s2_bits` form the fine token. Downstream the autoregressive model predicts s1 then s2|s1 (see the "hierarchical-dual-head-conditional-decoder" skill). The split is transparent to BSQ — it still learns a joint bit pattern; the LM just factors the softmax.

**Why this matters for practitioners:**
- No codebook collapse, no EMA maintenance, no warmup tricks.
- Index ↔ code conversion is a cheap bit-pack / bit-unpack: `(bits * 2**arange).sum()`.
- Works out-of-the-box for any continuous vector; swap it into any VQ-VAE-like architecture.
- Tradeoff: no learned codebook means the geometry of the quantized space is fully determined by the input normalization — L2-normalize `z` before quantization for a well-behaved sphere.
