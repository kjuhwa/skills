---
version: 0.3.0-draft
name: circuit-breaker-hysteresis-trip-reset-gap
description: "Tests whether circuit-breaker trip/reset threshold gap of 3-5% minimizes oscillation — hysteresis calibration paper."
type: hypothesis
status: draft
category: arch
tags:
  - circuit-breaker
  - hysteresis
  - calibration
  - non-cost-displacement
  - oscillation-control

premise:
  if: "we sweep circuit-breaker trip/reset threshold gap (0-10% error rate) on a simulated service with realistic error pattern (steady + bursty)"
  then: "oscillation rate is minimized when gap = 3-5%; smaller gaps oscillate (rapid trip/reset), larger gaps cause unnecessary downtime"

examines:
  - kind: technique
    ref: arch/feature-flag-killswitch-with-circuit-state
    note: "the technique whose hysteresis gap calibration this paper measures"
  - kind: paper
    ref: data/backpressure-hysteresis-gap-calibration
    note: "sibling hysteresis paper #1 — buffer-fill (existence sub-question)"

perspectives:
  - by: technique-author
    view: "the technique mandates trip > reset (some hysteresis gap) but doesn't specify magnitude. Operators today guess; the paper closes that with measured optimal gap range."
  - by: skeptic
    view: "optimal gap may be domain-specific — high-traffic services need wider gap (smooth oscillation), low-traffic need narrower (quick recovery). 3-5% may be one-tier-only."
  - by: corpus-curator
    view: "second hysteresis paper, joining #1195. Cluster forming (1 → 2) toward 7th stable 3-paper cluster. Sub-question pair: existence of gap (#1195) + calibration of gap (this paper)."

experiments:
  - name: gap-sweep-vs-oscillation
    status: planned
    method: "Simulated service with 3 error patterns (steady 5%, bursty 10% spikes, gradual climb 1→15%). Sweep gap 0-10%. Per (pattern, gap): record oscillation events + downtime + recovery delay."
    measured: "oscillation count per gap; cumulative downtime; recovery delay; minimum-cost gap per pattern"
    result: null
    supports_premise: null
    refutes: "implicit assumption that any non-zero hysteresis gap is operationally sufficient"
    confirms: null

requires:
  - kind: technique
    ref: arch/feature-flag-killswitch-with-circuit-state
    note: "the technique under test"
  - kind: paper
    ref: data/backpressure-hysteresis-gap-calibration
    note: "first hysteresis paper — pairs with this PR to form forming-cluster"
---

# Circuit-Breaker Hysteresis Trip/Reset Gap Calibration

> Tests whether circuit-breaker trip/reset threshold gap of 3-5% error rate minimizes oscillation while keeping downtime bounded. **Second hysteresis-shape paper** — joins #1195 (backpressure buffer-fill) to start the hysteresis cluster forming (1 → 2).

## Introduction

The technique `arch/feature-flag-killswitch-with-circuit-state` requires hysteresis: trip threshold > reset threshold to prevent flap-flap oscillation. The technique is silent on the magnitude of the gap. Operators today guess — common defaults are gap=2% (e.g., trip=10%, reset=8%) or gap=5% (trip=10%, reset=5%).

This paper measures whether gap magnitude matters and what range minimizes oscillation without causing unnecessary downtime.

### Hysteresis cluster sub-question pair (forming)

| Paper | Sub-question | Domain |
|---|---|---|
| #1195 backpressure-hysteresis-gap-calibration | **Existence** (buffer high-water/low-water gap exists) | Producer-consumer queue |
| **this paper** | **Calibration** (circuit-breaker trip/reset gap optimal range) | Circuit-breaker error rate |

Together they form a 2-paper hysteresis cluster (forming). A 3rd hysteresis paper covering variant sub-question would complete it (e.g., cache eviction high/low watermark hysteresis).

### Why hysteresis (NOT cost-displacement)

The cost-displacement framing for this question would have been:

> "as gap grows, oscillation cost shrinks but downtime cost grows; crossover at optimal gap"

Wrong shape. The actual shape is:

- Gap < 1%: oscillation cliff (rapid trip/reset)
- Gap 3-5%: stable plateau (oscillation near zero, downtime bounded)
- Gap > 7%: downtime cliff (unnecessary extended outages)

**Stable plateau between two cliffs**, not smooth crossover. This is hysteresis-shape — same as #1195's backpressure analysis. Per #1188's verdict rule, deliberately framed around the actual shape.

## Methods

For each of 3 error patterns:
1. **Steady 5%** — constant low error rate
2. **Bursty 10% spikes** — periodic spikes during otherwise-quiet baseline
3. **Gradual climb 1%→15%** — error rate rises slowly over time

Sweep gap across {0, 1, 2, 3, 5, 7, 10}% (with trip threshold fixed at 10%, reset threshold = trip - gap).

For each (pattern, gap) combination: simulate 1000 windows. Record:
- **Oscillation count** — trip + reset cycles per unit time
- **Cumulative downtime** — total time in OPEN state
- **Recovery delay** — time from error subsiding below reset threshold to circuit re-closure

Compute optimal gap per pattern as the value minimizing (oscillation × downtime) cost. Hypothesis confirmed if optimal gap ∈ [3%, 5%] for at least 2 of 3 patterns.

### What this paper is NOT measuring

- **Adaptive gap** — fixed gap per simulation. Gap that auto-tunes from observed flap rate is a different technique.
- **Cross-flag interactions** — single circuit. Multi-circuit dependencies out of scope.
- **Cost displacement** — no smooth trade-off; stable plateau between two cliffs.
- **Recovery strategies** — measures hysteresis only, not what happens during reset (gradual ramp vs immediate full traffic).

## Results

`status: planned` — no data yet. Result populates when at least one error pattern has been swept.

Expected output table (template):

| Pattern | Gap | Oscillation/100s | Downtime % | Recovery delay | Optimal? |
|---|---:|---:|---:|---:|---|
| steady 5% | 0% | TBD | TBD | TBD | TBD |
| steady 5% | 3% | TBD | TBD | TBD | TBD |
| steady 5% | 7% | TBD | TBD | TBD | TBD |
| bursty 10% | 3% | TBD | TBD | TBD | TBD |
| bursty 10% | 5% | TBD | TBD | TBD | TBD |
| gradual climb | 3% | TBD | TBD | TBD | TBD |
| gradual climb | 5% | TBD | TBD | TBD | TBD |

## Discussion

### What this paper opens (hysteresis cluster forming)

If hypothesis lands (optimal gap ∈ [3%, 5%]):
- Second hysteresis paper covering calibration sub-question
- Hysteresis cluster enters forming-cluster regime (1 → 2)
- Practical operator rule: default to gap=4% across most circuit-breaker setups

A 3rd hysteresis paper (variant sub-question) would complete the cluster as the 7th stable 3-paper cluster — natural candidate: cache eviction high/low watermark hysteresis.

### What would refute the hypothesis

- Optimal gap < 1% in all patterns → hysteresis ineffective; technique should warn that gap may not solve oscillation
- Optimal gap > 7% in all patterns → 3-5% range too narrow; technique default should be wider
- Pattern-conditional optima with no overlap (e.g., steady=2%, bursty=8%) → no universal default; technique should specify pattern-aware gap rule

### What partial-support would look like

- Optimal in [3%, 5%] for 2 of 3 patterns, 3rd pattern needs wider → technique gains pattern-conditional rule (steady gets 4%, bursty gets 6%)
- Optimal exactly at 5% across all → tighter than predicted; technique can prescribe 5% as universal default

## Limitations (planned)

- **3 error patterns is small** — production error patterns are more diverse (sudden spike, slow drift, periodic, adversarial)
- **Single trip threshold** — only varies gap, not trip threshold. Real systems need to calibrate both
- **Synthetic simulation** — no production trace anchor. Real services have noise that simulation may not capture
- **No multi-window aggregation** — error rate measured in 1-window granularity. Sliding-window vs tumbling-window affects oscillation
- **Single circuit** — no inter-circuit feedback (one trips → traffic shifts → next trips)

## Provenance

- Authored: 2026-04-26 (post-#1213 convergence cluster completion)
- Tests technique `arch/feature-flag-killswitch-with-circuit-state`
- Worked example #18 of paper #1188's verdict rule — hysteresis framing, not cost-displacement
- **Second hysteresis-shape paper** — joins #1195 (backpressure) to start the hysteresis cluster forming (1 → 2)
- Status `draft` until experiment runs. Closure path: 3 patterns × 7 gaps × 1000 windows.
- Sibling paper opportunity for cluster completion: cache eviction high/low watermark hysteresis (variant sub-question) — would form 7th stable 3-paper cluster
