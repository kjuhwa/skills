---
name: block-size-constrained-enumeration-with-register-pressure
description: When enumerating GEMM block sizes, reject candidates where both block_m and block_n exceed 128 — the register file on Hopper/Blackwell cannot support both dims going large simultaneously.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [register-pressure, gpu-optimization, kernel-tuning, hopper, blackwell]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/heuristics/sm100.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Block-Size Constrained Enumeration With Register Pressure

## What / Why
On SM90/SM100, the 256 KB register file is shared across 128 threads per SM. A GEMM with both `block_m > 128` and `block_n > 128` cannot hold the full accumulator + TMA state in registers and will spill to local memory — 100-1000× slower than register access. Bake this constraint into the candidate enumerator so no spilling config ever reaches the scoring stage.

## Procedure
1. **Enumerate candidates** over a bounded grid:
   - SM90: `block_m ∈ {16, 32, 64, 128, 256}` (prefer small when `m ≤ 32`), `block_n` in arch-specific steps of `lcm(16, block_n_multiple_of)`.
   - SM100: `block_m ∈ {32, 64, 128}`, `block_n ∈ {16, 32, ..., 128 or 256}`.
2. **Hard reject.** After the enumeration, drop any candidate where `block_m > 128 && block_n > 128`. Even if the smem math works, the accumulator won't.
3. **Per-kernel extra constraints.** E.g., SM90 1D2D kernel requires `(block_n − block_k) % unroll == 0`; reject misaligned candidates here too.
4. **Then apply the smem + stage count + swizzle pipeline** (see `smem-capacity-aware-pipeline-staging`).

## Key design points
- This is a *structural* reject, not a scoring penalty. Even if the cost model thinks `(256, 256)` would be fast, the spill cost dwarfs the model's estimate.
- The "128" threshold is empirical for the current Hopper/Blackwell register file size + per-thread reservation for math. On future archs, revisit the constant.
- Typical per-thread usage: ~100-120 registers for math + TMA state. `block_m × block_n / num_threads` gives the accumulator footprint.

## References
- `csrc/jit_kernels/heuristics/sm90.hpp` — rejection in `get_best_configs`.
- `csrc/jit_kernels/heuristics/sm100.hpp` — same gate, different enumeration ranges.
