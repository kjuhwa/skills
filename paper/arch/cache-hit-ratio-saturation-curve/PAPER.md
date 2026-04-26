---
version: 0.3.0-draft
name: cache-hit-ratio-saturation-curve
description: "Tests whether cache hit-ratio saturates near working-set size with no inversion — saturation calibration paper."
type: hypothesis
status: draft
category: arch
tags:
  - cache
  - hit-ratio
  - saturation
  - working-set
  - non-cost-displacement

premise:
  if: "we sweep cache size from 1KB to 1GB on Zipfian access pattern with 100K key universe and measure hit-ratio per cache size"
  then: "hit-ratio saturates at cache size ≈ 80-90% of working-set size, plateaus thereafter (95%+ stable), no inversion past saturation"

examines:
  - kind: paper
    ref: arch/thread-pool-throughput-saturation
    note: "sibling saturation paper #1 — concurrency domain (existence)"

perspectives:
  - by: cache-author
    view: "operators size caches by intuition (50% of total memory, 100MB tier, etc.). Paper measures whether saturation point is measurable from working-set + access pattern, enabling principled sizing."
  - by: skeptic
    view: "Zipfian has long tail — cold keys keep arriving so cache may never fully saturate. Predict: hit-ratio monotonic but plateau is gradual not sharp; saturation point varies with tail thickness."
  - by: corpus-curator
    view: "second saturation paper, joining #1218. Cluster forming (1 → 2). Sub-question pair: existence in concurrency (#1218) + calibration in cache memory (this paper). 3rd would form 9th stable cluster."

experiments:
  - name: cache-size-sweep-vs-hit-ratio
    status: planned
    method: "Cache size {1KB, 10KB, 100KB, 1MB, 10MB, 100MB, 1GB} × 3 access patterns (Zipfian-α=0.7, Zipfian-α=1.0, uniform). 100K-op trace. Compute hit-ratio + saturation point per pattern."
    measured: "hit-ratio per (size, pattern); saturation point as % of working-set; plateau stability past saturation; inversion check"
    result: null
    supports_premise: null
    refutes: "implicit assumption that cache hit-ratio always shows saturation (some patterns may never saturate before working-set limit)"
    confirms: null

requires:
  - kind: paper
    ref: arch/thread-pool-throughput-saturation
    note: "first saturation paper — pairs to start cluster forming (1 → 2)"
---

# Cache Hit-Ratio Saturation Curve

> Tests whether cache hit-ratio saturates near working-set size with no inversion. **Second saturation-shape paper** — joins #1218 (thread pool throughput) to start the saturation cluster forming (1 → 2).

## Introduction

Cache sizing is one of the most common operational questions: "how much memory should this cache get?" Common heuristics — 50% of total memory, 100MB per tier — are convention not measurement.

The principled answer depends on:
- **Working-set size** — how many bytes of distinct keys are accessed in a window
- **Access pattern** — how concentrated accesses are (Zipfian power-law) vs uniform

This paper tests whether hit-ratio shows saturation behavior — rises to plateau as cache approaches working-set, then stays stable past saturation. If yes, principled sizing is possible: target cache = X% of working-set.

### Saturation cluster sub-question pair (forming)

| Paper | Sub-question | Domain |
|---|---|---|
| #1218 thread-pool-throughput-saturation | **Existence** (saturation exists in concurrency) | Concurrency primitive |
| **this paper** | **Calibration** (where saturation occurs as fraction of working-set) | Cache memory |

A 3rd saturation paper covering variant sub-question (e.g., connection pool throughput vs pool size) would complete the cluster as the **9th stable 3-paper cluster**.

### Why saturation (NOT cost-displacement)

Cost-displacement framing for this question would have been:

> "as cache grows, miss-cost shrinks but memory cost grows; crossover at optimal cache size"

Wrong shape. The actual claim:

- Cache size < working-set × 0.5: hit-ratio rises rapidly
- Cache size ≈ working-set × 0.8-0.9: hit-ratio saturates (95%+)
- Cache size > working-set × 1.5: hit-ratio plateaus (stays at saturation)

The curve has **no inversion** — bigger cache wastes memory but doesn't reduce hit-ratio. Per #1188's verdict rule, deliberately framed around the actual shape (saturation), not cost-displacement.

### Why cache domain is the natural sibling for #1218

Both domains share:
- Single parameter to tune (size)
- Single metric to measure (hit-ratio / throughput)
- Resource cost grows with parameter (memory / threads)
- No fundamental reason for inversion past optimal

If both saturate without inversion, the saturation-without-crossover shape category has structural backing — it's not a one-off finding from concurrency, it generalizes to memory.

## Methods

For each of 3 access patterns:

1. **Zipfian α=0.7** — moderately concentrated (typical web cache)
2. **Zipfian α=1.0** — heavily concentrated (hot-key dominance)
3. **Uniform** — no concentration (cache-unfriendly worst case)

For each cache size in {1KB, 10KB, 100KB, 1MB, 10MB, 100MB, 1GB}:

1. Generate 100K key access trace from chosen pattern (key universe = 100K keys, working-set ≈ 10MB)
2. Run LRU cache simulation
3. Record:
   - Hit-ratio (final)
   - Saturation point (smallest size where hit-ratio is within 5% of max)
   - Plateau stability (variance of hit-ratio across sizes past saturation)
   - Inversion check (does hit-ratio drop past any size?)

Hypothesis confirmed if saturation point ≤ working-set × 0.9 AND plateau variance < 2% across 3+ post-saturation sizes AND no inversion across all 3 patterns.

### What this paper is NOT measuring

- **Pathological access** — adversarial workloads that defeat LRU may show no saturation
- **Multi-tier caches** — single tier; L1+L2 hierarchies have different dynamics
- **Cost displacement** — explicitly NOT this shape; paper distinguishes from cost-displacement framing
- **Cache replacement variants** — LRU only; LFU, ARC may saturate at different points

## Results

`status: planned` — no data yet. Result populates when at least one access pattern completes 7-size sweep.

Expected output table (template):

| Pattern | Sat point % WS | Hit-ratio at sat | Hit-ratio at 10× sat | Inversion? | Plateau var |
|---|---:|---:|---:|---|---:|
| Zipfian α=0.7 | TBD | TBD | TBD | TBD | TBD |
| Zipfian α=1.0 | TBD | TBD | TBD | TBD | TBD |
| Uniform | TBD | TBD | TBD | TBD | TBD |

## Discussion

### What this paper opens (saturation cluster forming)

If hypothesis lands (saturation across 3 patterns, no inversion):
- Second saturation paper covering calibration sub-question
- Saturation cluster enters forming-cluster regime (1 → 2)
- Practical operator rule: size cache to working-set × 0.8-0.9 for hit-ratio at saturation

A 3rd saturation paper (e.g., connection pool throughput) would complete the cluster as the **9th stable 3-paper cluster** — extending corpus shape coverage to 9 stable categories.

### What would refute the hypothesis

- Hit-ratio shows inversion past large size (e.g., GC pause from oversized cache) → saturation has crossover, collapses into cost-displacement
- Saturation point > working-set × 1.5 → hit-ratio doesn't reach plateau within reasonable cache size; no operational saturation
- Pattern-conditional behavior (Zipfian saturates, uniform doesn't) → saturation depends on access concentration; partial generalization

### What partial-support would look like

- Saturation in Zipfian patterns but not uniform → uniform access has no saturation operationally; technique should specify pattern-conditional rule
- Saturation point varies widely across patterns (50% to 150% of working-set) → calibration is workload-conditional; needs working-set-aware sizing not fixed %

## Limitations (planned)

- **3 access patterns is small** — production diversity is wider (bursty, periodic, adversarial)
- **Synthetic 10MB working-set** — may not extrapolate to real production caches with multi-GB working-sets
- **LRU only** — eviction policy variants may show different saturation
- **Single-tier cache** — multi-tier hierarchies excluded
- **No cost dimension** — measures hit-ratio, not memory cost or operational cost

## Provenance

- Authored: 2026-04-26 (post-#1218 saturation category opening)
- Worked example #23 of paper #1188's verdict rule — saturation calibration framing
- **Second saturation-shape paper** — joins #1218 to start the saturation cluster forming (1 → 2)
- Status `draft` until experiment runs. Closure path: 7 sizes × 3 patterns × 100K-op trace.
- Sibling paper opportunity: 3rd saturation paper for cluster completion (9th stable cluster) — natural candidate: connection pool throughput vs pool size
