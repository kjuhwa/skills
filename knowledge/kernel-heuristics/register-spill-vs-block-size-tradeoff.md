---
version: 0.1.0-draft
name: register-spill-vs-block-size-tradeoff
summary: On Hopper/Blackwell (256KB reg file shared by 128 threads) both block_m and block_n cannot exceed 128 simultaneously without spilling to local memory, which is 100-1000x slower.
category: kernel-heuristics
tags: [register-allocation, spills, gpu-optimization, hopper, blackwell]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
  - csrc/jit_kernels/impls/sm90_fp8_gemm_1d1d.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Register Spill vs Block-Size Tradeoff

## Summary
SM90 and SM100 each have a **256 KB register file per SM**, shared across 128 threads (2 KB per thread theoretical max). A GEMM accumulator of `block_m × block_n` FP32 values per 128 threads occupies `block_m × block_n × 4 / 128` bytes per thread — combined with TMA descriptor state, pipeline barrier phase, and scratch, this blows the budget whenever both `block_m > 128` AND `block_n > 128`.

The cost of spilling is catastrophic: local memory lives in global memory, goes through L1/L2, and is 100-1000× slower than register access. One register spill per iteration of an inner loop erases any block-size benefit.

## Why it matters
- DeepGEMM hard-rejects `block_m > 128 && block_n > 128` in both SM90 and SM100 heuristics. Not a soft scoring penalty — a structural reject.
- SM100 is slightly more flexible because cluster multicast reduces per-cluster load block size (`block_m/cluster_n` and `block_n/cluster_m`), but the fundamental register limit still applies per block.
- Typical register usage: ~100-120 per thread for math + TMA state, with the rest of the 2 KB budget going to accumulator tiles.

## Practical implications
- When tuning GEMM heuristics on a new arch, set the "big_m AND big_n → reject" gate as a first-class constraint, not a scoring term.
- If you must go bigger, use smaller accumulator dtype (BF16 accumulator in tensor cores) or split-K to reduce per-block accumulator footprint.
- Monitor `local_store_transactions` in Nsight — any non-zero value on a fresh kernel means spills snuck in.
