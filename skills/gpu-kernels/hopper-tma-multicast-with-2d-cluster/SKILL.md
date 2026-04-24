---
name: hopper-tma-multicast-with-2d-cluster
description: Enable 2D thread-block clustering so TMA loads can broadcast A across cluster_n and B across cluster_m, cutting effective memory bandwidth and improving L2 reuse.
category: gpu-kernels
version: 1.0.0
version_origin: extracted
tags: [hopper, tma-multicast, clustering, l2-cache, gpu-optimization]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Hopper TMA Multicast With 2D Cluster

## What / Why
Hopper thread-block clusters (up to 8 blocks) let a single TMA load reach multiple blocks via multicast. In GEMM, clustering in the N direction means A tiles broadcast to all blocks in the cluster; clustering in M direction broadcasts B. Effective memory bandwidth drops proportionally, and L2 hit rate goes up. But clustering adds synchronization, so it only helps when there's enough work to amortize it.

## Procedure
1. **Enumerate cluster dims.** `cluster_m ∈ {1, 2}`, `cluster_n ∈ {1, 2}`. Skip `cluster_m × cluster_n > 2` (Hopper sweet spot is 2-way clustering for GEMM).
2. **Legality gates.**
   - `num_sms % (cluster_m × cluster_n) == 0` — cluster must tile the SM grid cleanly.
   - For masked or paged variants: also require `ceil_div(n, block_n) % (cluster_m × cluster_n) == 0`.
3. **Amortization guard.** Skip multicast if `num_waves ≤ 1` — not enough work; cluster sync overhead > benefit.
4. **K-grouped exception.** Disable if K-grouped GEMM has `>4` groups — the cross-group barrier cost dominates.
5. **Pass cluster dims to launch config** via `CU_LAUNCH_ATTRIBUTE_CLUSTER_DIMENSION`; the TMA multicast mode is implicit once clustering is enabled and the kernel uses `cp.async.bulk.tensor` with the multicast variant.

## Key design points
- Multicast is *not* free — cluster sync + smaller effective occupancy. Always score with the cost model, don't blanket-enable.
- The 2×2 cluster is the current Hopper default for GEMM — beyond that, cluster sync latency wins.
- When comparing candidates, a multicast config should win only if `cycles_with_multicast < cycles_without × 0.9-ish` (i.e., meaningful margin). Borderline wins flip on noise.

## References
- `csrc/jit_kernels/heuristics/sm90.hpp` — cluster enumeration and the `num_waves ≤ 1` early-out.
