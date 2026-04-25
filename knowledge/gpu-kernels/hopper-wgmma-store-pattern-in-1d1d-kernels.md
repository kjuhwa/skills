---
version: 0.1.0-draft
name: hopper-wgmma-store-pattern-in-1d1d-kernels
summary: SM90 1D1D GEMM uses 64-thread warp-group stores (wgmma_m=64) for C/D instead of block_m stores, reducing smem C/D footprint and simplifying the epilogue barrier protocol.
category: gpu-kernels
tags: [hopper, wgmma, warp-group, epilogue, store-pattern, sm90]
confidence: medium
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

# Hopper WGMMA Store Pattern in 1D1D Kernels

## Summary
The SM90 1D1D GEMM variant uses **warp-group-sized stores** for the C/D output (store block height = 64, matching the wgmma_m unit) rather than block-sized stores (64 = `wgmma_m`). The kernel:

- Loads full `block_m × block_k` A tile and `block_n × block_k` B tile per stage.
- Each warp group (128 threads) performs wgmma on 64-row accumulator chunks.
- Stores C/D in those same 64-row chunks via TMA, not as one `block_m × block_n` burst.

Compared to the 1D2D variant (which does block-sized stores), 1D1D amortizes less across the store but pays less smem overhead.

## Why it matters
- Per-warp-group stores mean **smaller smem C/D footprint** (one 64×block_n tile vs one block_m×block_n tile) — frees budget for more pipeline stages.
- Simpler epilogue barrier: only warp-group-level sync needed, not block-level.
- Decouples **compute block size** (block_m, block_n) from **store block size** (wgmma_m = 64). Lets heuristics pick larger `block_m` for math efficiency without inflating store smem.
- 1D2D falls back to `block_m`-sized stores when `block_n > block_k` — needed for wider-N kernels where 64-row stores cover too few elements.

## Practical implications
- When tuning SM90 kernels, treat `wgmma_m=64` as a fixed architectural quantum. Don't try to fuse stores.
- If your shape has `block_n >> block_k`, 1D2D is probably better — don't force 1D1D just because it has better smem.
- The 1D1D/1D2D split is dispatched automatically (see `multi-kernel-dispatch-with-shape-driven-selection`); users shouldn't care which runs.
