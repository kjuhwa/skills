---
version: 0.3.0-draft
name: cache-eviction-watermark-hysteresis
description: "Tests whether cache eviction high/low watermark gap of 15-25% minimizes thrash — hysteresis variant paper."
type: hypothesis
status: draft
category: arch
tags:
  - cache
  - eviction
  - hysteresis
  - watermark
  - non-cost-displacement

premise:
  if: "we sweep cache eviction high/low watermark gap (5%-50%) on LRU cache under realistic access pattern (Zipfian + bursty fill)"
  then: "optimal gap is 15-25% — smaller gaps thrash (constant eviction-fill cycle), larger gaps waste capacity (cache too empty for too long)"

examines:
  - kind: technique
    ref: data/producer-consumer-backpressure-loop
    note: "shares hysteresis-shape with cache eviction; baseline reference"
  - kind: paper
    ref: data/backpressure-hysteresis-gap-calibration
    note: "sibling hysteresis paper #1 — buffer fill (existence)"
  - kind: paper
    ref: arch/circuit-breaker-hysteresis-trip-reset-gap
    note: "sibling hysteresis paper #2 — circuit-breaker (calibration)"

perspectives:
  - by: cache-author
    view: "operators today guess high/low watermark from intuition. The paper bounds the optimal range so cache configs can default sensibly without per-deployment tuning."
  - by: skeptic
    view: "Zipfian access patterns may obscure thrash signal — hot keys stay cached regardless of watermark. Predict: optimal gap is access-pattern-conditional, no universal range."
  - by: corpus-curator
    view: "third hysteresis paper, completing the cluster as 7TH STABLE 3-paper cluster. Sub-question coverage: existence (#1195) + calibration (#1214) + variant cross-domain (this paper)."

experiments:
  - name: watermark-gap-vs-thrash-rate
    status: planned
    method: "LRU cache × 3 access patterns (Zipfian/uniform/bursty). Sweep gap {5-50%} with high-water=90%. Record thrash rate + hit-ratio + utilization. Full protocol in body."
    measured: "thrash rate per gap; hit-ratio drop; capacity utilization; optimal gap per access pattern"
    result: null
    supports_premise: null
    refutes: "implicit assumption that any non-zero hysteresis gap is sufficient for cache eviction"
    confirms: null

requires:
  - kind: paper
    ref: data/backpressure-hysteresis-gap-calibration
    note: "first hysteresis paper — pairs to complete cluster"
  - kind: paper
    ref: arch/circuit-breaker-hysteresis-trip-reset-gap
    note: "second hysteresis paper — pairs to complete cluster (3 → stable)"
---

# Cache Eviction Watermark Hysteresis

> Tests whether cache eviction high/low watermark gap of 15-25% minimizes thrash without wasting capacity. **Third hysteresis-shape paper** — completes the hysteresis cluster as the **7TH STABLE 3-PAPER CLUSTER** (after threshold-cliff, necessity, Pareto, self-improvement, universality, convergence).

## Introduction

Cache eviction commonly uses a high-water/low-water rule: when capacity exceeds high-water, evict to low-water. The gap between thresholds prevents thrash — without hysteresis, the cache would oscillate between just-under-full and just-evicted in a tight loop, dominating CPU with eviction work.

Operators choose watermarks ad hoc. Common defaults: high=85%, low=75% (gap=10%) or high=90%, low=70% (gap=20%). Whether one is meaningfully better than the other is usually not measured.

This paper tests whether 15-25% gap is the operational sweet spot.

### Hysteresis cluster sub-question triad COMPLETE

| Paper | Sub-question | Domain |
|---|---|---|
| #1195 backpressure-hysteresis-gap-calibration | **Existence** (buffer high/low gap exists) | Producer-consumer queue |
| #1214 circuit-breaker-hysteresis-trip-reset-gap | **Calibration** (trip/reset gap optimal) | Circuit-breaker error rate |
| **this paper** | **Variant** (cross-domain to cache memory) | LRU cache eviction |

Per #1205's verdict ("cluster saturates at N=3 covering existence + calibration + variant"), this triad makes hysteresis the **7th stable 3-paper cluster**.

### Why hysteresis (NOT cost-displacement)

The cost-displacement framing for this question would have been:

> "as gap grows, thrash cost shrinks but capacity-waste cost grows; crossover at optimal gap"

Wrong shape. The actual shape:

- Gap < 10%: thrash cliff (constant eviction-fill cycle, CPU domination)
- Gap 15-25%: stable plateau (thrash near zero, hit-ratio preserved)
- Gap > 30%: capacity cliff (cache too empty, hit-ratio degraded unnecessarily)

**Stable plateau between two cliffs**, same hysteresis-shape as #1195 (backpressure) and #1214 (circuit-breaker). Per #1188's verdict rule, deliberately framed around the actual shape.

## Methods

For each of 3 access patterns:
1. **Zipfian** — power-law key distribution (typical web cache)
2. **Uniform** — random key access (ideal worst-case)
3. **Bursty** — periodic spikes of fresh keys (typical content cache)

Sweep gap across {5, 10, 15, 20, 25, 30, 50}% with high-water fixed at 90%. For each (pattern, gap):

1. Simulate 100K cache operations
2. Record:
   - **Thrash rate** — eviction events per access
   - **Hit-ratio** — cache hit % vs baseline (no eviction)
   - **Capacity utilization** — mean fill ratio

Compute optimal gap per pattern as the value minimizing (thrash × (1 - hit-ratio)). Hypothesis confirmed if optimal gap ∈ [15%, 25%] for at least 2 of 3 patterns.

### What this paper is NOT measuring

- **Cache replacement policy variants** — only LRU. LFU, ARC, etc., may have different watermark behavior
- **Multi-tier caches** — single tier. L1+L2 cache hierarchies have inter-tier dynamics
- **Cost displacement** — no smooth trade-off; plateau-between-cliffs shape
- **Adaptive watermarks** — fixed gap. Online-learned gap is a different technique

## Results

`status: planned` — no data yet. Result populates when at least one access pattern completes 100K-op simulation.

Expected output table (template):

| Pattern | Gap | Thrash/op | Hit-ratio | Capacity util | Optimal? |
|---|---:|---:|---:|---:|---|
| Zipfian | 5% | TBD | TBD | TBD | TBD |
| Zipfian | 15% | TBD | TBD | TBD | TBD |
| Zipfian | 25% | TBD | TBD | TBD | TBD |
| Uniform | 15% | TBD | TBD | TBD | TBD |
| Bursty | 15% | TBD | TBD | TBD | TBD |

## Discussion

### What this paper completes (7th stable cluster)

If hypothesis lands (optimal ∈ [15%, 25%] for ≥2 of 3 patterns):
- Third hysteresis paper covering variant sub-question
- Hysteresis reaches stable 3-paper cluster status — **7th stable cluster**
- Practical operator rule: default cache watermark gap = 20% (high=90%, low=70%)

### Why this matters for cluster taxonomy

The 7 stable clusters now span:

- **Phenomena clusters**: threshold-cliff, necessity, Pareto, self-improvement, convergence, hysteresis (6)
- **Meta-shape cluster**: universality (1)

If hypothesis lands, hysteresis joins the phenomena clusters at saturation. The corpus has 6 stable phenomena clusters + 1 stable meta-shape cluster = 7 total.

### What would refute the hypothesis

- Optimal < 10% in any pattern → hysteresis ineffective in cache; technique should investigate alternative anti-thrash mechanism
- Optimal > 30% in all patterns → 15-25% range too narrow; default needs widening
- Pattern-conditional optima with no overlap (Zipfian=10%, Bursty=35%) → no universal default; pattern-aware rule needed

### What partial-support would look like

- Optimal in [15%, 25%] for Zipfian + Uniform but [25%, 35%] for Bursty → Bursty workloads need wider gap; technique gains pattern-conditional default rule
- Hit-ratio dominates thrash in cost calculation → optimal gap shifts toward larger end of range (capacity preservation matters more)

## Limitations (planned)

- **Synthetic access patterns** — production caches see continuously varying mixes
- **Single LRU policy** — eviction policy variants unmeasured
- **Single-tier cache** — multi-tier interactions out of scope
- **Fixed cache size** — small vs large cache may shift optimal gap differently
- **No cost dimension** — measures thrash + hit-ratio, not memory cost or operational cost

## Provenance

- Authored: 2026-04-26 (post-#1215 log-search cluster start)
- Worked example #20 of paper #1188's verdict rule — hysteresis variant framing
- **Third and final hysteresis-shape paper** — completes the hysteresis cluster as the **7TH STABLE 3-PAPER CLUSTER**
- Status `draft` until experiment runs. Closure path: 3 patterns × 7 gaps × 100K ops.
- Sibling paper opportunity: hysteresis universality across #1195/#1214/this PR — would extend universality cluster (currently 3 papers stable)
