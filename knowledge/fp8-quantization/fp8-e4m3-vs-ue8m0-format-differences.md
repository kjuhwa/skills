---
version: 0.1.0-draft
name: fp8-e4m3-vs-ue8m0-format-differences
summary: SM90 consumes FP32 scales + E4M3 FP8 values; SM100 expects packed UE8M0 (unsigned-exponent, no mantissa) int32 scales with different range/precision tradeoffs.
category: fp8-quantization
tags: [fp8, ue8m0, e4m3, quantization, data-format, hardware-specific]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - README.md
  - csrc/apis/layout.hpp
  - csrc/jit_kernels/impls/sm100_fp8_fp4_gemm_1d1d.hpp
imported_at: 2026-04-18T13:12:58Z
---

# FP8 E4M3 vs UE8M0 Format Differences

## Summary
When feeding FP8 block-scaled GEMM, the expected **scale format** depends on the target arch:

- **SM90 (Hopper):** scales are standard **FP32** tensors, shape `[m/gran_m, k/gran_k]`. Element format is **E4M3** (4 exp bits, 3 mantissa). Scales are transformed to MN-major and TMA-aligned at dispatch time.
- **SM100 (Blackwell):** scales are **packed UE8M0** — 4 FP32 scales compressed into one `int32` via a special 8-bit-unsigned-exponent encoding with zero mantissa. Elements are still FP8 E4M3 (or FP4 E2M1 for weights). DeepGEMM auto-converts FP32→UE8M0 via `get_mn_major_tma_aligned_packed_ue8m0_tensor()` if users pass FP32.

## Why it matters
- UE8M0 captures a **larger dynamic range** than FP32-scaled E4M3 (unsigned exponent covers 0..255), but has zero mantissa precision — the scale is effectively "a power of two." Block-scaled kernels rely on this because within a block, only the exponent varies meaningfully.
- Memory bandwidth for scales drops **4×** (4 values per int32).
- Downstream kernel behavior differs: SM100 uses **tensor memory (TMEM)** to compute SF on-chip; SM90 uses shared memory. Descriptor types match.
- Saturation and rounding semantics differ — a scale that's representable in FP32 but not in UE8M0 rounds to the nearest representable exponent, which can shift quantization error distributions.

## Practical implications
- If you integrate DeepGEMM on a mixed cluster (SM90 + SM100), produce FP32 scales once; DeepGEMM repacks per arch at dispatch.
- Don't hand-code UE8M0 — use the provided packer. The bit layout isn't a trivial float-reinterpret.
- Validation tolerances differ across archs for the same recipe; account for it in cross-arch regression tests.
