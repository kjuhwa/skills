---
name: cycle-estimation-via-bandwidth-and-wave-efficiency
description: Score kernel config candidates with a closed-form cost model combining L1/L2 bandwidth-limited cycles, compute cycles, and wave-efficiency loss from partial final waves.
category: performance-modeling
version: 1.0.0
version_origin: extracted
tags: [performance-modeling, gpu-optimization, heuristics, cost-model, wave-efficiency]
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

# Cycle Estimation via Bandwidth and Wave Efficiency

## What / Why
To rank kernel configs without actually running them, estimate total cycles as the max of (L1 cycles, L2 cycles, compute cycles), then divide by wave efficiency to penalize configs whose last wave is half-empty. The model doesn't need to be accurate in absolute terms — just good enough to rank-order candidates.

## Procedure
1. **Compute L2 bytes per block.**
   ```
   l2_bytes_per_block = k × (block_m / cluster_n + block_n / cluster_m) × elem_size
   ```
   (multicast reduces effective fetch per cluster by the cluster dim).
2. **Compute L1 bytes per block.**
   ```
   l1_bytes_per_block = k × (block_m + block_n)
   ```
3. **Epilogue L1+L2 cost for C/D.**
   ```
   cd_bytes = block_m × block_n × elem_size × (2 if accumulating else 1)
   ```
4. **Convert bytes to cycles** using peak sustainable bandwidth per SM:
   ```
   l2_cycles = total_l2_bytes / (64 bytes × num_sms)
   l1_cycles = total_l1_bytes / (128 bytes × num_sms)
   ```
5. **Wave efficiency.**
   ```
   num_blocks     = ceil_div(m, block_m) × ceil_div(n, block_n)
   num_waves      = ceil_div(num_blocks, num_sms / (cluster_m × cluster_n))
   wave_efficiency = num_blocks / (num_waves × num_sms)
   ```
6. **Total cycles.** `max(l1_cycles, l2_cycles, compute_cycles) / wave_efficiency`.
7. **Compare.** Lower is better. Additionally: if `num_waves == 1`, disable multicast (reuse benefit fits in-wave but cluster sync still costs you).

## Key design points
- Constants are machine tunables — `64 bytes × num_sms` per cycle for L2 is the Hopper figure, revise per arch.
- The model ignores memory latency and focuses on bandwidth; for small-shape kernels, augment with a TMA-descriptor-latency term or drop candidates with `num_stages < 3`.
- Keep the cost function pure — takes config, returns cycles. Makes unit-testing the scorer trivial.

## References
- `csrc/jit_kernels/heuristics/sm90.hpp` — cost function used by `get_best_configs`.
