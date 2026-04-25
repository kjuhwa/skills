---
version: 0.1.0-draft
name: hierarchical-token-split-s1-s2-high-low-bits
summary: Kronos splits each BSQ code into high bits (s1, coarse token) and low bits (s2, fine token) so the LM uses two small softmaxes instead of one huge one.
category: design
tags: [hierarchical-tokens, vocabulary-split, softmax, kronos, design-decision, dual-head]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/module.py, model/kronos.py]
imported_at: 2026-04-18T00:00:00Z
---

# Why Kronos splits each code into two hierarchical tokens

**The problem.** Kronos's tokenizer produces bit codes with `codebook_dim = s1_bits + s2_bits` bits per timestep. With a typical `s1 = s2 = 10`, the effective vocabulary is `2^20 ≈ 1,048,576` codes. A single softmax of that size per step is (a) huge in memory — the head matrix alone is `d_model × 2^20`, gigabytes at `d_model=512` — and (b) hard to learn, because most codes are never used by any realistic training sequence.

**The factorization.** Kronos re-parameterizes `p(code | history)` as `p(s1 | history) · p(s2 | history, s1)`:
- `s1` is the high bits (top `s1_bits`), a coarse token.
- `s2` is the low bits (bottom `s2_bits`), a fine token.

This turns two 2^20 tables (embedding + head) into four 2^10 tables — `2 × 2^10 × d_model` for input embeddings plus `2 × d_model × 2^10` for output heads — about **1024× less memory** per piece.

**Where the conditioning happens.** The Transformer stack produces a contextual `x`. `DualHead.forward` projects that to `s1_logits`. To get `s2_logits`:
1. Pick an s1 token — ground truth during teacher forcing, or a `multinomial` draw from `s1_logits.detach()` during training-time "sampled" mode, or the decoded s1 during inference.
2. Look up its embedding (`HierarchicalEmbedding.emb_s1`) — the *sibling embedding*.
3. Run a `DependencyAwareLayer` that does cross-attention with `sibling_embed` as query and `x` as key/value.
4. Project the result through `DualHead.cond_forward` → `s2_logits`.

**Why this specific split.** BSQ bits are sign patterns on a sphere; the model doesn't "know" which bits are coarse vs fine, but any balanced split keeps the per-head softmax tractable. Splitting into `10/10` (vs `15/5` or `18/2`) keeps both heads roughly equally informative — a heavily unbalanced split leaves one head trivially predictable and the other doing all the work. The reconstruction path uses both halves jointly, so the tokenizer is agnostic to the split.

**Alternatives and why Kronos didn't pick them.**
- Full `2^20` softmax — too big to train efficiently.
- Parallel (not conditional) heads — predicts `s1` and `s2` independently, so `p(s1, s2)` is factorized as a product of marginals, missing their correlation. For BSQ where bits are coupled through the geometry of the sphere, this hurts quality.
- Residual-VQ with separate codebooks per layer — adds codebook parameters, the thing BSQ was chosen to avoid.

**Downstream implications.** Every inference step now takes two sequential sampling calls (`decode_s1` → sample → `decode_s2` → sample), about 2× the per-step work of a plain causal LM. The `KronosPredictor.predict_batch` implementation still parallelizes across batch and sample_count, so the constant-factor hit is acceptable relative to the memory savings.

See the `hierarchical-dual-head-conditional-decoder` skill for the implementation recipe, and the `binary-spherical-quantization-bsq-overview` knowledge entry for the quantizer itself.
