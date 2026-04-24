---
name: multi-stage-heuristic-selection-with-comparators
description: Enumerate all legal kernel configs under hardware constraints, score each with an arch-specific cost model (cycles / wave efficiency), and pick the winner via a comparator.
category: kernel-heuristics
version: 1.0.0
version_origin: extracted
tags: [heuristics, gpu-optimization, config-search, performance-modeling, comparator]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/heuristics/sm100.hpp
  - csrc/jit_kernels/heuristics/config.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Multi-Stage Heuristic Selection With Comparators

## What / Why
Avoid manual tuning of GPU kernels across thousands of shapes. Instead, generate the full space of legal `(block_m, block_n, block_k, cluster_m, cluster_n, num_stages, swizzle)` tuples for a given matrix shape + hardware, score each tuple, and pick the best. The cost model is specific to the architecture — SM90 uses cycle estimates, SM100 uses wave efficiency plus multicast preference.

## Procedure
1. **Enumerate block candidates.** Iterate block_m over `{16,32,64,128,256}` (bounded by `m`), block_n over arch-specific step sizes, block_k over a narrow set (typically 64 or 128 for FP8).
2. **Apply fast rejections.**
   - `block_m > 128 && block_n > 128` → reject (register pressure).
   - Swizzle mode of A/B must be ≥ 64B — reject 32B swizzle (≈ 50% perf loss).
   - cluster size must divide num_sms; certain kernels require `ceil_div(n, block_n) % cluster_dim == 0`.
3. **Compute storage & stage count.** Determine swizzle modes from `lcm(16, inner_dim × elem_size)`, compute per-stage smem, derive `num_stages = (smem_total − fixed_overhead) / per_stage_size`.
4. **Reject under-pipelined candidates.** `num_stages < 3` (or `<4` for small matrices) cannot hide TMA latency — drop.
5. **Score.** Pass remaining candidates through arch comparator:
   - SM90: estimate L1/L2 cycles and compute cycles, account for wave efficiency (how full the last wave is), pick min cycles.
   - SM100: prefer configs with higher wave efficiency and multicast enabled when beneficial.
6. **Return winner** or warn if no candidate passed all legality gates.

## Key design points
- Keep the enumerator declarative — a pure function from shape → vector of candidates. Makes it testable without a GPU.
- Split the comparator per arch rather than a single mega-heuristic — the performance cliffs differ.
- Store the loss function constants (64B L2 throughput, barrier overhead, etc.) as named constexprs for easy tuning.

## References
- `csrc/jit_kernels/heuristics/sm90.hpp` — `get_best_configs()` style selection.
- `csrc/jit_kernels/heuristics/sm100.hpp` — SM100 variant with different score function.
- `csrc/jit_kernels/heuristics/config.hpp` — shared config struct + validation helpers.
