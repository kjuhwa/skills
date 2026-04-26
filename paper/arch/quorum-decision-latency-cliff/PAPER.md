---
version: 0.3.0-draft
name: quorum-decision-latency-cliff
description: "Tests whether quorum decision latency cliffs sharply at exactly N/2+1 available peers — threshold-cliff shape paper."
type: hypothesis
status: draft
category: arch
tags:
  - quorum
  - threshold-cliff
  - consensus
  - non-cost-displacement
  - latency

premise:
  if: "we measure consensus decision latency as a function of available peers, sweeping from quorum-minus-one through quorum-plus-many across multiple cluster sizes"
  then: "decision latency exhibits a discontinuous cliff at exactly N/2+1 available peers — below it, latency is unbounded (no decision); at it, latency drops to one round-trip"

examines:
  - kind: technique
    ref: arch/multi-peer-quorum-decision-loop
    note: "the technique whose threshold-cliff shape claim this paper tests"

perspectives:
  - by: technique-author
    view: "the off-by-one math is exact — N/2+1 majority. The cliff exists by construction. The paper measures whether real systems exhibit it sharply or smear it via timeout/retry mechanics."
  - by: skeptic
    view: "real implementations smear the cliff via failure-detector timeouts. Sub-quorum may eventually decide via re-election; super-quorum may add ack-collection latency. Cliff blurs in practice."
  - by: corpus-curator
    view: "first threshold-cliff paper in the corpus (was 0/22 in #1188). Begins clustering threshold-cliff as a paper-shape category. Worked example #3 of #1188's verdict rule."

experiments:
  - name: latency-vs-available-peers
    status: planned
    method: "Simulate Raft-like consensus across cluster sizes N ∈ {3, 5, 7}. For each N, sweep available peers from N/2 to N. Measure decision latency at each step. Plot latency vs available-peer count."
    measured: "decision latency at each available-peer count; discontinuity magnitude at N/2+1; effect of failure-detector timeout on cliff sharpness"
    result: null
    supports_premise: null
    refutes: "implicit assumption that latency degrades smoothly as peers fail"
    confirms: null

requires:
  - kind: technique
    ref: arch/multi-peer-quorum-decision-loop
    note: "the technique under test"
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "survey that surfaced this paper opportunity (Finding 4) and motivates non-cost-displacement framing"
---

# Quorum Decision Latency Cliff

> Tests the threshold-cliff shape claim of `technique/arch/multi-peer-quorum-decision-loop`. Worked example #3 of paper #1188's verdict rule — first threshold-cliff paper in the corpus, begins clustering threshold-cliff as a coherent paper-shape category alongside hysteresis (#1195) and log-search (#1194).

## Introduction

The technique `multi-peer-quorum-decision-loop` requires N/2+1 available peers for a decision. Below quorum, the system cannot decide; at quorum, decisions complete in one round-trip; above quorum, additional peers add ack-collection cost but the decision still completes.

This paper tests whether the latency curve is genuinely **discontinuous** at exactly N/2+1, or whether real implementations smear the cliff via failure-detector timeouts and retry mechanics.

### Why threshold-cliff, not crossover

The cost-displacement framing for this question would have looked like:

> "as available peers grow, ack-collection cost grows but uncertainty cost shrinks; crossover at optimal peer count"

That framing is **wrong about the shape**. The actual shape:

- Below N/2+1: latency = ∞ (no decision possible)
- At N/2+1: latency = 1 round-trip (decision in minimum time)
- Above N/2+1: latency = 1 round-trip (additional peers add no critical-path work)

**Discontinuity at exactly one point.** Not a smooth tradeoff. The cliff is a structural property of the off-by-one math, not an empirical optimum.

This is the kind of shape distinction paper #1188 warned about — defaulting to crossover lens would suggest "find the optimal peer count" when the actual answer is "exactly N/2+1 is the structural minimum; any more is overprovisioning."

### Why the cliff might smear in practice

Three mechanisms could blur an otherwise-sharp cliff:

1. **Failure-detector timeouts** — sub-quorum may eventually decide via leader re-election after the failure detector marks dead peers. Latency at quorum-1 is then `failure_detector_timeout + 1 round-trip` rather than ∞.
2. **Optimistic over-collection** — super-quorum implementations may wait briefly for additional acks (e.g. for read-quorum semantics or strong consistency). Latency above quorum is then `1 round-trip + small wait` rather than exactly `1 round-trip`.
3. **Network jitter** — at exactly quorum, the slowest of N/2+1 peers determines latency. As N grows, the tail probability of one slow peer grows. The cliff becomes a soft transition.

The hypothesis says the cliff is still **detectable as a discontinuity** despite these smearing mechanisms — the gap between "below quorum" and "at quorum" should be at least an order of magnitude, even if neither side is exactly its theoretical value.

## Methods

For each cluster size N ∈ {3, 5, 7}:

1. Run a simulated Raft-like consensus protocol with N peers.
2. Sweep available peers from N/2 (sub-quorum) up to N (full).
3. At each step, drive 1000 consensus decisions and measure latency distribution.
4. Record:
   - Median latency at each available-peer count
   - p99 latency at each available-peer count
   - Decision-success rate (decisions that completed within timeout)
   - Discontinuity magnitude at quorum (= median latency at quorum) / (median at quorum-1)

Compute discontinuity ratio across the 3 cluster sizes. Hypothesis confirmed if ratio ≥ 10× across all 3 (i.e., cliff is detectable as a clear order-of-magnitude jump).

### What this paper is NOT measuring

- **Optimal cluster size** — there is no "what's the best N?" question; the technique addresses the off-by-one math at any N. This paper measures the cliff at each N independently.
- **Cost displacement** — there is no "as N grows, cost X grows but cost Y shrinks" claim. The hypothesis is purely about discontinuity at the threshold.
- **Production trace replay** — the paper uses simulation. A follow-up could replay production etcd or ZooKeeper traces.
- **Multi-cliff structures** — some quorum systems have additional cliffs (read-quorum vs write-quorum). This paper tests only the write-quorum cliff.

## Results

`status: planned` — no data yet. Result will populate when at least one cluster size has been swept.

Expected output table (template):

| N | Available peers | Median latency | p99 latency | Success rate | Discontinuity ratio |
|---:|---:|---:|---:|---:|---:|
| 3 | 1 | TBD | TBD | TBD | — |
| 3 | 2 (quorum) | TBD | TBD | TBD | TBD |
| 3 | 3 | TBD | TBD | TBD | — |
| 5 | 2 | TBD | TBD | TBD | — |
| 5 | 3 (quorum) | TBD | TBD | TBD | TBD |
| 5 | 4 | TBD | TBD | TBD | — |
| 5 | 5 | TBD | TBD | TBD | — |
| 7 | ... | TBD | TBD | TBD | TBD |

## Discussion

### Why this paper exists in the non-cost-displacement column

Paper #1188 found 8/22 papers (36%) frame as cost-displacement crossover, while only 2/25 techniques (8%) do. Threshold-cliff appears in 3/25 techniques and **0/22 papers** — the largest layer-gap of any shape. This paper is the first of three threshold-cliff papers (siblings at #1189 and #1193) that together close the gap.

If the hypothesis lands (discontinuity ratio ≥ 10× across all 3 N values), the corpus gains:

- One concrete threshold-cliff paper, opening the category
- A measurable signature for "is this system's quorum cliff sharp or smeared?"
- Evidence the bias-correction methodology of #1188 produces non-template papers reliably

### What would refute the hypothesis

- Discontinuity ratio < 3× in any cluster size → cliff is too smeared to be useful as a design assumption; technique should re-frame as "soft threshold" rather than "cliff"
- Discontinuity at N/2 instead of N/2+1 → off-by-one math is wrong; technique implementation has a bug
- Latency above quorum grows linearly with N → super-quorum is NOT free; ack-collection adds non-trivial cost, technique's "extra peers are free" assumption is wrong

### What partial-support would look like

- Discontinuity ratio ≥ 10× in N=3, N=5 but degrades to <5× in N=7 → cliff sharpness is N-conditional; technique should note the degradation for large clusters
- Cliff is sharp but in a different position (e.g. 2N/3+1 due to flexible-quorum read/write semantics) → the cliff exists; just not where the technique's strict-majority assumption puts it

## Limitations (planned)

- **Simulation, not production** — synthetic Raft may miss real-world tail behavior (network partition, garbage collection, disk fsync variance).
- **3 cluster sizes is small** — production clusters span N=3 to N=11+. The 3-size sweep is a starting point, not coverage.
- **Single failure-detector setting** — failure-detector timeout is the dominant smearing mechanism. The paper holds it constant; sweeping it would be a sibling paper.
- **No multi-tenant or multi-region** — all peers in one logical cluster. Cross-region quorum may have different cliff characteristics due to RTT asymmetry.

## Provenance

- Authored: 2026-04-26
- Files against issue #1190 (one of 5 untested-shape paper opportunities surfaced by #1188 Finding 4)
- Tests technique `arch/multi-peer-quorum-decision-loop`
- Worked example #3 of paper #1188's verdict rule (siblings: #1194 log-search, #1195 hysteresis, this PR threshold-cliff)
- First of 3 threshold-cliff sibling papers (others: #1189 feature-flag-killswitch, #1193 contract-test quorum)
- Status `draft` until experiment runs. Closure path: simulate Raft across 3 cluster sizes; status transitions to `reviewed` then `implemented`.
