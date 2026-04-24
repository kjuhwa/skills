---
name: comprehensive-gpu-kernel-testing-harness
description: Test GPU kernels by running random-shape sweeps against a FP32 reference, using tolerance-aware diff metrics that account for quantization noise, plus TFLOPS/bandwidth bench.
category: testing-gpu
version: 1.0.0
version_origin: extracted
tags: [testing, gpu-kernels, quantization, benchmarking, numerical-validation]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - tests/test_mega_moe.py
  - tests/test_fp8_fp4.py
  - deep_gemm/testing/__init__.py
imported_at: 2026-04-18T13:12:58Z
---

# Comprehensive GPU Kernel Testing Harness

## What / Why
Low-precision GEMM kernels cannot be compared against a `torch.matmul` baseline with a fixed `atol` — quantization error is shape-and-granularity-dependent. A proper test harness generates random shapes, computes a BF16/FP32 reference *with the same quantization*, compares via a tolerance-aware diff, and tracks performance so accuracy improvements don't silently regress throughput.

## Procedure
1. **Shape sweep.** Parametrize `m ∈ [1, 8192]`, `n, k ∈ [256, 16384]`, vary channel dims for MoE; include edge cases (`m=1`, `k=gran_k`, non-multiples of block sizes).
2. **Reference pipeline.**
   - Cast inputs to FP32.
   - Apply the *same* per-token/per-block quantization recipe (`per_token_cast_to_fp8`) used by the kernel.
   - Dequantize back to FP32.
   - Matmul in FP32 for ground truth.
3. **Tolerance-aware diff.**
   - `calc_diff(actual, expected)` uses relative error, with `atol` scaled by `gran_k` (coarser granularity → looser tolerance).
   - For FP4 weights: `atol ≈ 0.02` is typical; for FP8: `atol ≈ 0.005`.
4. **Performance bench.** `bench(fn, num_warmup, num_runs)` returns median μs; convert to TFLOPS via `2 × m × n × k / time`; compare against roofline (MFU %).
5. **Distributed flows.** Run MoE tests under `torch.distributed` with a reference kernel (e.g., DeepEP) on the same synthetic data to catch rank-coordination bugs.

## Key design points
- Never compare low-precision output against `torch.matmul(bf16)` — the reference must share the quantization step, or you're measuring "FP8 vs FP32" instead of "our kernel vs reference FP8".
- Separate correctness and perf into different test files so CI can skip perf on non-GPU runners.
- Log the shape, config (block_m/n/k, num_stages), and MFU in every bench output — regressions are shape-specific.

## References
- `deep_gemm/testing/__init__.py` — `calc_diff`, `bench`, shape generators.
- `tests/test_fp8_fp4.py` — GEMM correctness sweep.
- `tests/test_mega_moe.py` — distributed MoE correctness + bench against DeepEP.
