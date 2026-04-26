---
version: 0.3.0-draft
name: quorum-vote-threshold-by-consumer-reliability
description: "Tests whether contract-test quorum threshold scales with consumer reliability variance — threshold-cliff paper."
type: hypothesis
status: draft
category: testing
tags:
  - contract-testing
  - threshold-cliff
  - quorum-vote
  - consumer-fleet
  - non-cost-displacement

premise:
  if: "we sweep quorum threshold from majority (N/2+1) to unanimity (N) across synthetic consumer fleets with varying reliability distributions (low/mid/high variance)"
  then: "optimal threshold is a function of consumer reliability variance — high-variance fleets need higher quorum (3/4); low-variance fleets tolerate 2/3"

examines:
  - kind: technique
    ref: testing/contract-test-with-consumer-verification
    note: "the technique whose quorum-vote threshold this paper calibrates"

perspectives:
  - by: technique-author
    view: "the technique uses 2/3 as default but punts on whether it generalizes. The paper closes that with a reliability-conditional rule — 2/3 may suit homogeneous fleets but fail on heterogeneous ones."
  - by: skeptic
    view: "consumer reliability is hard to estimate ahead of time. A conditional rule needs data the operator may not have. A robust default (2/3) may be more usable even if not optimal."
  - by: corpus-curator
    view: "third threshold-cliff paper, completing the cluster (#1196 existence + #1197 single-component + this fleet-aggregation). Threshold-cliff now a coherent paper-shape with 3 worked examples."

experiments:
  - name: vote-threshold-vs-reliability-variance
    status: planned
    method: "Simulate N=6, N=9 consumer fleets at 3 reliability variances. Sweep quorum threshold N/2+1 to N. Per setting: 1000 releases, record false-pass + false-fail. Full protocol in body Methods."
    measured: "false-pass rate (incompatible change deployed), false-fail rate (compatible change blocked); optimal threshold per (N, variance)"
    result: null
    supports_premise: null
    refutes: "implicit assumption that 2/3 quorum suits any consumer fleet"
    confirms: null

requires:
  - kind: technique
    ref: testing/contract-test-with-consumer-verification
    note: "the technique under test"
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "survey that surfaced this paper opportunity (Finding 4) and motivates non-cost-displacement framing"
---

# Quorum-Vote Threshold by Consumer Reliability

> Tests whether the ≥2/3 quorum-vote default in `technique/testing/contract-test-with-consumer-verification` scales with consumer-fleet reliability variance. Worked example #5 of paper #1188's verdict rule. **Third and final threshold-cliff paper**, completing the cluster started by #1196 (cliff existence) and #1197 (single-component calibration).

## Introduction

The technique `contract-test-with-consumer-verification` requires that ≥2/3 of consumers pass the contract test before a producer change is considered compatible. The 2/3 default is convention, not derivation:

> Producer publishes candidate change. Each consumer runs contract test independently. Quorum vote (e.g. ≥2/3 pass) decides compatibility — not unanimity.

This paper tests whether 2/3 generalizes across consumer-fleet shapes — specifically, whether **fleet reliability variance** shifts the optimal threshold.

### Threshold-cliff sub-question split (now complete)

The three threshold-cliff papers cover three complementary sub-questions:

| Paper | Sub-question | Domain | Calibration target |
|---|---|---|---|
| #1196 quorum-decision-latency-cliff | does the cliff exist? | atomic consensus (1 cluster) | none — fixed by math |
| #1197 killswitch-trip-threshold-calibration | where do we put it? | single circuit (1 component) | per-traffic-class |
| **this paper** | how does it scale with fleet variance? | distributed vote (N consumers) | per-(N, variance) |

The three papers together establish threshold-cliff as a coherent paper-shape category with three worked examples covering structural existence, single-component calibration, and fleet-aggregation calibration.

### Why threshold-cliff (NOT cost-displacement)

The cost-displacement framing for this question would have looked like:

> "as quorum grows, false-fail cost grows but false-pass cost shrinks; crossover at optimal quorum"

That framing is **partially defensible but wrong about the structure**. The actual claim:

- Below optimal: false-pass risk dominates (incompatible changes slip through because quorum was too easy)
- At optimal: false-pass and false-fail rates both minimized given reliability variance
- Above optimal: false-fail risk dominates (compatible changes blocked because one flaky consumer fails)

The **cliff exists per fleet shape**. Cost-displacement would suggest one optimal value across all fleets; threshold-cliff says cliff position is fleet-conditional calibration.

### Why fleet variance is the load-bearing axis

For a low-variance fleet (all consumers ~99% reliable), 2/3 quorum is robust — unlikely that >1/3 fail simultaneously on a compatible change. For a high-variance fleet (one consumer at 80%, others at 99%), 2/3 quorum can be defeated by the unreliable consumer alone — the 80% consumer's transient failures cause repeated false-fails.

The hypothesis: optimal threshold is a function of variance, not just N. High-variance fleets need higher quorum (e.g. 3/4 or 4/5) to absorb the unreliable members; low-variance fleets tolerate 2/3.

## Methods

For each combination of fleet size N ∈ {6, 9} and reliability variance ∈ {low, mid, high}:

- **Low variance** — all consumers at 99% reliability
- **Mid variance** — half consumers at 99%, half at 95%
- **High variance** — most consumers at 99%, one outlier at 80%

Sweep quorum threshold from N/2+1 to N (i.e., {4, 5, 6} for N=6; {5, 6, 7, 8, 9} for N=9). For each (N, variance, threshold) combination:

1. Drive 1000 candidate-change events
2. 50% of changes are TRULY compatible (consumer should pass)
3. 50% are TRULY incompatible (consumer should fail, but with consumer-reliability noise)
4. Record:
   - false-pass rate (incompatible accepted because quorum was too lenient)
   - false-fail rate (compatible rejected because too many consumers had transient failures)
   - combined cost (= false-pass + false-fail)

Compute optimal threshold per (N, variance). Hypothesis confirmed if optimal threshold differs across variances within the same N (i.e., variance is the load-bearing axis, not just N).

### What this paper is NOT measuring

- **Adaptive quorum** — fixed thresholds per (N, variance). Adaptive (learned from history) is a different technique.
- **Producer-side rollback** — contract failure → release blocked, paper does not measure rollback workflow.
- **Multi-version contracts** — single contract version. Multi-version compatibility is a separate question.
- **Cost displacement** — there is no "as threshold grows, cost X shrinks but cost Y grows linearly with crossover" claim. The shape is per-fleet calibration, not smooth cost trade-off.

## Results

`status: planned` — no data yet. Result will populate when at least one (N, variance) combination is swept.

Expected output table (template):

| N | Variance | Threshold | False-pass | False-fail | Combined cost |
|---:|---|---:|---:|---:|---:|
| 6 | low | 4 | TBD | TBD | TBD |
| 6 | low | 5 | TBD | TBD | TBD |
| 6 | low | 6 | TBD | TBD | TBD |
| 6 | mid | ... | TBD | TBD | TBD |
| 6 | high | ... | TBD | TBD | TBD |
| 9 | low | ... | TBD | TBD | TBD |
| 9 | mid | ... | TBD | TBD | TBD |
| 9 | high | ... | TBD | TBD | TBD |

## Discussion

### Why this paper completes the threshold-cliff cluster

Paper #1188 found 8/22 papers framed as cost-displacement crossover, while only 2/25 techniques did. Threshold-cliff was 0/22 papers vs 3/25 techniques — the largest layer-gap of any shape. The three threshold-cliff papers (#1196, #1197, this) close the gap with three complementary worked examples.

The cluster's coherence is itself the contribution: threshold-cliff isn't a single question with one paper, it's a shape category with sub-questions. Future authors interrogating threshold-cliff techniques can pattern after one of the three depending on which sub-question their technique surfaces.

### What would refute the hypothesis

- Optimal threshold is the same across all variances within N → variance doesn't matter; technique can prescribe a single per-N rule (e.g. "always 2/3 of N")
- Optimal threshold = N (always unanimity) regardless of variance → false-pass cost dominates so heavily that any tolerance is too risky
- Combined cost is monotonically decreasing with threshold (no minimum) → the shape isn't a cliff at all; it's monotonic, technique should prescribe maximum tolerable threshold

### What partial-support would look like

- High-variance fleets need higher quorum but the rule is "+1 over default" not a continuous function of variance → simple shift rule, not a calibration formula
- N=6 and N=9 give same optimal-quorum-as-fraction-of-N (e.g. always 0.67 for low variance, 0.78 for high) → fraction-of-N is the right unit, not absolute count
- Optimal exists but band is wide (e.g. 4-5 for N=6 low-variance) → calibration matters in direction but not in precision

## Limitations (planned)

- **Synthetic reliability** — 99%/95%/80% values are stylized. Real consumer reliability follows long-tail distributions; the 3-class abstraction may not generalize.
- **No correlated failures** — consumers fail independently in simulation. Real consumers share dependencies (shared service, shared region) and correlate failures, which would shift the optimal threshold.
- **Two cluster sizes (N=6, N=9)** — production fleets span N=2 to N=20+. The two-size sweep may not extrapolate to extremes.
- **Static quorum threshold** — the technique describes a fixed default; this paper measures a fixed sweep. Adaptive quorum (e.g., raise threshold after recent false-passes) is a different technique.

## Provenance

- Authored: 2026-04-26
- Files against issue #1193 (one of 5 untested-shape paper opportunities surfaced by #1188 Finding 4)
- Tests technique `testing/contract-test-with-consumer-verification`
- Worked example #5 of paper #1188's verdict rule
- **Final threshold-cliff sibling paper** — completes the 3-paper cluster (#1196 + #1197 + this PR)
- All 5 paper opportunities from #1188 Finding 4 now have authored hypothesis papers (status=draft, awaiting experiments)
- Status `draft` until experiment runs. Closure path: simulate (N=6, N=9) × (low/mid/high variance); status transitions to `reviewed` then `implemented`.
