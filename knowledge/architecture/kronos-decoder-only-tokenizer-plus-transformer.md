---
version: 0.1.0-draft
name: kronos-decoder-only-tokenizer-plus-transformer
summary: Kronos factors the model into a BSQ tokenizer (encoder+decoder Transformer) plus a decoder-only causal Transformer with hierarchical dual-head output.
category: architecture
tags: [kronos, architecture, tokenizer, transformer, decoder-only, bsq, dual-head, rope]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, model/module.py]
imported_at: 2026-04-18T00:00:00Z
---

# Kronos architecture: tokenizer + causal transformer, both Transformer-based

Kronos uses a two-stage design that mirrors LLM-style pipelines.

**Stage 1 — `KronosTokenizer`.** Input is a `(B, T, d_in=6)` OHLCV+amount tensor. A linear `embed` projects it to `d_model`, an encoder stack of `n_enc_layers` `TransformerBlock`s processes it (RMSNorm + RoPE self-attention + SwiGLU FFN), a `quant_embed` linear projects down to `codebook_dim = s1_bits + s2_bits`, the `BSQuantizer` binarizes via `sign(z)` with a straight-through estimator and returns both a dense quantized tensor and integer indices. Two parallel decoder paths reconstruct the input — one from the pre half (top `s1_bits` only) and one from the full code — each with `n_dec_layers` Transformer blocks and a `head` linear back to `d_in`. Training loss is `mse(z_pre, x) + mse(z, x) + bsq_loss`, where `bsq_loss` combines commit and entropy regularizers.

**Stage 2 — `Kronos`.** A decoder-only causal Transformer over the discrete token stream. `HierarchicalEmbedding` maps `(s1_ids, s2_ids)` into separate embedding tables, concatenates, and projects back to `d_model`. A `TemporalEmbedding` adds per-field (minute/hour/weekday/day/month) embeddings. The core is `n_layers` `TransformerBlock`s with causal self-attention using `scaled_dot_product_attention(is_causal=True)` and RoPE-rotated queries/keys. The output goes through two heads:
- `DualHead.forward` emits `s1_logits` (vocab `2^s1_bits`).
- A `DependencyAwareLayer` (cross-attention where the query is the s1 sibling embedding and key/value is the transformer output) produces a fused representation, then `DualHead.cond_forward` emits `s2_logits` (vocab `2^s2_bits`).

Training uses teacher forcing on s1 (ground-truth s2-conditioning embedding); inference does AR decoding with `top_k`/`top_p`/`T` sampling in `auto_regressive_inference`, which also maintains a fixed `(B, max_context)` rolling token buffer so generation can extend past the training context length.

**Key hyperparameters (default `Kronos-small`-ish):**
- `s1_bits=10, s2_bits=10` → effective joint vocab 2^20
- `d_model=512–832`, `n_heads=8–16`, `ff_dim ≈ 2–4 × d_model`, `n_layers=8–12`
- `group_size=9` (BSQ entropy approximation group)
- Positional encoding: rotary (RoPE) in every attention module; RMSNorm pre-norm blocks; SwiGLU FFN (`SiLU(w1(x)) * w3(x)` → `w2`)

This architecture is the blueprint that makes many of the extracted skills (two-stage pipeline, BSQ hierarchical quantization, dual-head decoder, rolling-context AR, calendar-time embedding) cohesive.
