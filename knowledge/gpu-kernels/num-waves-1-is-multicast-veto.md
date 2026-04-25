---
version: 0.1.0-draft
name: num-waves-1-is-multicast-veto
description: On SM90, if a candidate layout results in exactly one wave of work across the SMs (`num_waves ≤ 1`), DeepGEMM explici...
type: knowledge
category: decision
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/sm90.hpp
tags: [multicast, waves, cluster, heuristic, amortization]
imported_at: 2026-04-18T13:30:00Z
---

# Single-Wave Work Size Vetoes Cluster Multicast

## Fact / Decision
On SM90, if a candidate layout results in exactly one wave of work across the SMs (`num_waves ≤ 1`), DeepGEMM explicitly vetoes multicast by setting its modeled cycle count to `INT64_MAX`. Single-wave jobs end before the cluster synchronization overhead can be amortized, so clustering is strictly worse than running each SM independently.

```cpp
if (layout.cluster_n * layout.cluster_m > 1 and num_waves <= 1)
    num_cycles = std::numeric_limits<int64_t>::max();
```

## Why it matters
- Cluster-enabled launches on Hopper require inter-block synchronization at a cluster-barrier. The cost is typically ~10-50 cycles per barrier.
- For a one-wave job, the barrier pays only once, *but* one-wave jobs are by definition small (block-count ≤ SM count). The barrier latency becomes a larger fraction of the total runtime.
- The cost model without this rule picks the wrong layout in small-N decoding cases, where the apparent L2 bandwidth savings from multicast look great but are measured against a pessimistic non-multicast baseline.
- The rule is a hard veto rather than a tiebreaker because multicast's cost is step-function (fixed barrier) while its benefit scales with re-use; below one-wave, re-use ≈ 0.

## Evidence
- `csrc/jit_kernels/heuristics/sm90.hpp:233-236`:
  ```cpp
  // Disable multicasting if only one wave exists
  if (layout.cluster_n * layout.cluster_m > 1 and num_waves <= 1)
      num_cycles = std::numeric_limits<int64_t>::max();
  ```
  The comment is direct.
- Context: SM90 comparator is `a.num_cycles < b.num_cycles`, so setting `num_cycles = MAX` ensures no single-wave multicast candidate ever wins.

## Caveats / When this doesn't apply
- **SM100 heuristic uses a different comparator** — not cycle-based. The SM100 comparator explicitly prefers larger cluster sizes as a tiebreaker *unless* single-wave is cleaner:
  ```cpp
  if ((a.num_waves == 1 or b.num_waves == 1) and a.num_waves != b.num_waves)
      return a.num_waves < b.num_waves;
  ```
  Different mechanism, same intuition: single-wave wins, and clustering is not free.
- **Wave count is computed on `expected_*` shapes**, not actual shapes, if the user supplies expected hints. A user who sets `expected_m=4096` for a dispatcher that sometimes runs m=32 pays the multicast overhead on the small cases.
- **The rule assumes symmetric cluster costs.** If you profile a specific cluster config that has asymmetric costs (e.g. cluster_n=2 with strong L2 reuse but cluster_m=2 with only barrier cost), a binary veto is too blunt; scale the penalty instead.
- **Masked grouped GEMM** has an even tighter constraint: the heuristic further requires `ceil_div(n, block_n) % (cluster_m * cluster_n) == 0` for multicast legality, on top of the wave-count veto.
