---
name: cosine-similarity-diff-for-fp8-numerics
description: Compare two tensors with `1 - 2*sum(x*y)/sum(x^2 + y^2)` instead of absolute max-diff — scale-insensitive, handles all-zero tensors, and gives an interpretable "fraction of disagreement" for FP8/FP4 reference-testing.
category: testing-gpu
version: 1.0.0
version_origin: extracted
tags: [numeric-testing, fp8, fp4, cosine-similarity, tolerance, gpu-testing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - deep_gemm/testing/numeric.py
  - tests/generators.py
imported_at: 2026-04-18T13:30:00Z
---

# Scale-Invariant Tensor Diff For Low-Precision GEMMs

## When to use
You're reference-testing a low-precision (FP8, FP4) GEMM against a BF16/FP32 truth. The usual `(x - y).abs().max()` is hostile:
- If `x` and `y` both have large dynamic range, max-diff is dominated by the single largest element even if 99% of the tensor matches.
- If one scaling factor is off, max-diff exaggerates. What you actually care about is "are they the same direction, roughly the same length".
- Max-diff doesn't map to a meaningful per-kernel tolerance — you end up tuning per-test magic numbers.

A cosine-similarity-style metric gives you a single scale-invariant number in roughly `[0, 2]`, and `< 0.001` is a clean bar for exact FP8 work.

## Steps
1. **Cast to double** before summing so a 10⁸-element tensor doesn't overflow or lose bits to FP32 summation:
   ```python
   x, y = x.double(), y.double()
   ```
2. **Compute the denominator** — sum of squared norms:
   ```python
   denominator = (x * x + y * y).sum()
   ```
3. **Handle the all-zero degenerate case** before dividing:
   ```python
   if denominator == 0:  # both x and y are all zero
       return 0.0
   ```
   Without this guard you'd get NaN. Zero is the semantically correct answer (they agree perfectly on "all zero").
4. **Cosine score, flipped to "diff":**
   ```python
   sim = 2 * (x * y).sum() / denominator
   return 1 - sim
   ```
   - `sim == 1` iff `x == y`; `sim ∈ [-1, 1]` in general.
   - `diff = 1 - sim` maps to `[0, 2]`, with 0 = identical, 2 = negated.
5. **Set per-precision tolerances** at the test level, not inside the metric:
   ```python
   def max_diff(self) -> float:
       if self.is_fp4_a and self.is_fp4_b: return 0.02
       if self.is_fp4_a or self.is_fp4_b: return 0.01
       return 0.001  # FP8 baseline
   ```
   Separate tolerances encode the precision hierarchy explicitly.

## Evidence (from DeepGEMM)
- `deep_gemm/testing/numeric.py:5-11`: the `calc_diff` implementation with the `denominator == 0` guard.
- `tests/generators.py:64-69`: the precision-tier tolerance table (`QuantConfig.max_diff()`).

## Counter / Caveats
- **This metric doesn't catch uniform shifts.** `x + 1000` has cosine 1 with `x`. If you care about bias, add a `(x - y).abs().mean() / x.abs().mean()` check alongside.
- **Cast to `double` costs memory.** A 100M-element tensor becomes 800MB of doubles. For 10B+ tensors, chunk the computation or stay in FP32 with Kahan summation.
- **`0.001` is FP8-tight on DeepGEMM's workloads.** A noisier kernel (e.g. an indexer with relu weights) legitimately exceeds it. Don't copy the number blindly — measure what your clean reference produces and set tolerance accordingly.
- **For grouped GEMMs with per-group scales**, compute diff per-group and take the max. Single scalar over the whole concatenated tensor can hide a single bad expert.
