---
version: 0.2.0-draft
name: feature-flag-flap-prevention-policies
description: "Feature flag breakers flap; hypothesis hysteresis ratio 1.5-2x is optimal — narrower flaps, wider delays trip"
category: arch
tags: [feature-flag, circuit-breaker, hysteresis, flap, hypothesis]
type: hypothesis

premise:
  if: A feature flag has a circuit breaker tied to error rate
  then: >-
    Hysteresis reduces flap when error rate hovers near the trip threshold (bursty
    and drifting workloads — flap drops from ~2.5/h to ≤1/h as ratio widens from
    1.0x to 2.0x). It does NOT reduce flap when error rate produces distinct
    above-threshold events (spiky workloads — flap stays at 1.21/h regardless of
    ratio in [1.2x, 3.0x]) because each spike both trips and clears below any
    reset-water. Trip-detection delay is governed by debouncing (consecutive-sample
    requirement), NOT by hysteresis ratio — the original claim that 'wider delays
    trip' conflated two orthogonal mechanisms. Optimal ratio is workload-conditional;
    the paper's original 1.5-2x claim holds for borderline-noise workloads only.

examines:
  - kind: skill
    ref: backend/conditional-feature-flag-rollout
    role: feature-flag-shape
  - kind: skill
    ref: workflow/circuit-breaker-data-simulation
    role: circuit-state-shape
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: counter-evidence
  - kind: knowledge
    ref: pitfall/canary-release-implementation-pitfall
    role: similar-flap-pattern

perspectives:
  - name: Why Single Threshold Flaps
    summary: Error rate at threshold ± noise produces oscillation. The breaker toggles state at every borderline read. Real systems see error rate hovering near threshold during transient issues, hitting flap directly.
  - name: Hysteresis as Geometry
    summary: Two thresholds (trip at H, reset at L < H) create a "dead zone" where state doesn't change. The dead-zone size is the flap-prevention budget.
  - name: Wider is Safer but Slower
    summary: Wider hysteresis → smaller flap risk → longer recovery delay. The relationship is monotonic but the optimum balances both.
  - name: Workload Shape Matters
    summary: Spiky workloads need wider hysteresis (more noise to absorb). Smooth workloads tolerate narrower. Universal optimum is workload-conditional.

external_refs: []

proposed_builds:
  - slug: hysteresis-tuning-tool
    summary: Tool that ingests historical error rate time-series for a flag, simulates breaker behavior at hysteresis ratios {1.2, 1.5, 2, 3}, computes flap count + average trip-detection delay. Recommends ratio per workload class.
    scope: poc
    requires:
      - kind: skill
        ref: backend/conditional-feature-flag-rollout
        role: flag-control-baseline
      - kind: knowledge
        ref: pitfall/circuit-breaker-implementation-pitfall
        role: known-bugs-to-avoid

experiments:
  - name: hysteresis-ratio-tradeoff
    hypothesis: Across 4 workload shapes (smooth, spiky, bursty, drifting), ratio 1.5x produces ≤1 flap/hour AND average trip-detection delay ≤10 min. Ratios <1.3x or >2.5x fail one of the two criteria.
    method: >-
      Synthesize 4 workload generators (smooth / spiky / bursty / drifting) producing
      24h of 1-sample/min error-rate time-series. Run each through a hysteresis breaker
      at ratios in {1.2, 1.5, 2.0, 2.5, 3.0} with trip-water=0.10. Tabulate flap-per-hour
      (state transitions to open) and average trip-detection delay in minutes.
    status: completed
    built_as: example/arch/hysteresis-tuning-tool
    result: |
      24h × 4 workloads × 5 ratios = 20 cells (deterministic, seed=42).

      Flap rate (transitions/h):
                       1.2x   1.5x   2.0x   2.5x   3.0x
        smooth         0.75   0.75   0.71   0.71   0.67
        spiky          1.21   1.21   1.21   1.21   1.21
        bursty         2.54   1.00   1.00   1.00   0.96
        drifting       0.92   0.25   0.08   0.08   0.08

      Trip-detection delay: 0.00 min in every cell (the simulator uses single-sample
      trip; the delay axis is governed by debouncing, not by hysteresis ratio,
      so this dimension was vacuous for this experiment design).

      Pass criteria:
        - ratio 1.5x ≤ 1 flap/h on ALL workloads → FAILS on spiky (1.21/h).
          Premise's specific 1.5x claim is refuted by 0.21/h on the spiky cell.
        - ratios <1.3x should fail flap → confirmed (1.2x flaps at 2.54/h on bursty).
        - ratios >2.5x should fail delay → not observable; delay was 0 across the
          board because hysteresis ratio does not affect trip detection in the absence
          of debouncing (this surfaces a conflation in the original premise).

      Verdict: partial. The directional claim (hysteresis reduces flap on borderline
      workloads — bursty and drifting) is supported and quantified. The specific
      1.5x-optimum claim is refuted on spiky workloads, where flap is invariant to
      ratio because each spike both trips and resets fully. The "wider delays trip"
      branch was about debouncing, not hysteresis — orthogonal to what hysteresis
      controls. Premise rewritten to reflect both findings.
    supports_premise: partial
    observed_at: 2026-04-25

outcomes:
  - kind: produced_example
    ref: arch/hysteresis-tuning-tool
    note: |
      Monte Carlo simulator implementing the proposed hysteresis-tuning-tool build.
      Closes experiments[0]. Output is deterministic (seed=42); the result table
      and partial-refute verdict are recorded both in the paper's experiments[0].result
      and in the example's README. Future runs that change the workload synthesis
      should regenerate both.

status: implemented
retraction_reason: null
---

# Feature Flag Flap-Prevention Policies

## Introduction

A feature flag tied to an error-rate circuit breaker faces a well-known oscillation problem: when error rate hovers near the trip threshold, single-threshold breakers toggle state at every borderline read, producing **flap**. Hysteresis (high-water trip / low-water reset) widens the decision boundary into a dead zone, but the choice of how wide to make it is usually left to operator intuition. The original draft of this paper hypothesized that ratio 1.5–2x is the universal optimum: ≤1 flap/hour AND ≤10 min trip-detection delay across all workload classes. The experiment in this paper tests that claim with a Monte Carlo simulator covering four workload shapes and five ratios.

### Background

`technique/arch/feature-flag-killswitch-with-circuit-state` documents the breaker shape but specifies hysteresis as "operator-tuned" — leaving the tuning rule undefined. This paper proposes that rule.

The pitfall `pitfall/circuit-breaker-implementation-pitfall` is the canonical counter-evidence: silent fallback, hidden state transitions, and the operational cost of misconfigured breakers. The sibling `pitfall/canary-release-implementation-pitfall` documents a similar flap pattern in canary rollouts (different mechanism, same shape). Both are relevant counter-evidence the paper inherits.

### Prior art

`external_refs[]` is empty. Useful directions for `/hub-research`:

- Control-theory hysteresis literature — Schmitt-trigger geometry, dead-zone tuning rules from analog electronics. The intuition transfers but the cost model is different (analog has zero compute cost per state read; software circuit breakers don't).
- Site reliability engineering literature on circuit-breaker tuning — Hystrix postmortems, resilience4j defaults, Netflix outage retrospectives.
- Adversarial workload analysis — what shape of input maximizes flap rate against a given hysteresis ratio? This is the worst-case bound the paper does not characterize.

### What this paper sets out to test

Whether a single hysteresis ratio (specifically 1.5x or 2.0x) prevents flap on a representative set of workload shapes, and whether wider ratios materially delay trip detection.

## Methods

### Cost model

A circuit breaker reads error rate at fixed sampling interval `δt` and transitions state by:

```
closed → open    when  error_rate ≥ trip_water        (high-water mark H)
open   → closed  when  error_rate ≤ trip_water / R    (low-water mark L = H/R)
```

where `R ≥ 1` is the **hysteresis ratio**. `R = 1` collapses to a single-threshold breaker (no dead zone, maximum flap).

Two metrics matter:

- **Flap rate** — count of `closed → open` transitions per unit time. Target: ≤1/h.
- **Trip-detection delay** — time between error rate first crossing `H` and the breaker actually transitioning to `open`. Target: ≤10 min average.

### Workload synthesis

Four synthetic workload generators producing 24h of 1-sample/min error-rate time-series (`N = 1440` samples each):

| Workload | Pattern |
|---|---|
| smooth | stable ~5% error rate, σ = 2% gaussian noise, rare 1-sample spikes |
| spiky | baseline 5%, ~5-minute spikes to 12-18% every ~30 minutes |
| bursty | alternating 30-min calm (3-7%) and busy (8-14%) periods |
| drifting | sinusoidal drift between 4% and 13% over the day, 1% noise |

Generators are seeded (`seed=42`) so results are deterministic and reproducible.

### Simulator

`example/arch/hysteresis-tuning-tool/simulate.py` implements the breaker described above. For each (workload × ratio) pair, it:

1. Generates the time-series for the workload class
2. Steps through samples 1 minute at a time, applying the state machine
3. Counts `closed → open` transitions (flap units)
4. Records the latency between first sample exceeding `H` and the actual trip (trip-detection delay)
5. Reports both metrics per cell

Trip is single-sample (no debouncing) — the simulator tests hysteresis-as-deadzone, not hysteresis-with-debounce. This is a deliberate scope choice; the conflation between hysteresis and debouncing is itself part of the result.

### Cell matrix

5 ratios × 4 workloads = 20 cells. Trip-water fixed at `H = 0.10` (10% error rate). Reset-water `L = H/R` varies with ratio.

## Results

### Flap rate per cell

| Workload | R=1.2x | R=1.5x | R=2.0x | R=2.5x | R=3.0x |
|---|---:|---:|---:|---:|---:|
| smooth | 0.75 | 0.75 | 0.71 | 0.71 | 0.67 |
| spiky | 1.21 | 1.21 | 1.21 | 1.21 | 1.21 |
| bursty | 2.54 | 1.00 | 1.00 | 1.00 | 0.96 |
| drifting | 0.92 | 0.25 | 0.08 | 0.08 | 0.08 |

(units: flap-per-hour, transitions to `open` state)

### Trip-detection delay

`0.00 min` in every cell. The simulator's single-sample trip means trip-detection delay is governed by debouncing (consecutive-sample requirement), NOT by hysteresis ratio. This dimension was vacuous for the experiment design.

### Pass/fail evaluation

The premise predicted ratio 1.5x passes both criteria (≤1 flap/h AND ≤10 min delay) on ALL workloads.

| Ratio | Flap criterion | Delay criterion | Verdict |
|---|---|---|---|
| 1.2x | FAIL on bursty (2.54/h), spiky (1.21/h) | n/a (vacuous) | flap-fail |
| 1.5x | **FAIL on spiky (1.21/h)** | n/a | flap-fail |
| 2.0x | FAIL on spiky (1.21/h) | n/a | flap-fail |
| 2.5x | FAIL on spiky (1.21/h) | n/a | flap-fail |
| 3.0x | FAIL on spiky (1.21/h) | n/a | flap-fail |

The premise's central claim — that 1.5x is universally optimal — is refuted. No tested ratio passes the flap criterion on the spiky workload because spiky's flap rate is **invariant** to hysteresis ratio in [1.2x, 3.0x].

### Workload-conditional finding

Hysteresis works on **bursty** (2.54 → 1.00 flap/h) and **drifting** (0.92 → 0.08 flap/h) workloads as ratio widens to 1.5x – 2.0x. It does not work on **spiky** because each spike both trips the breaker and clears below any reset-water before the next spike — the dead zone never engages between spikes. Smooth workloads show modest gains across all ratios (0.75 → 0.67) because most samples are well below trip-water; hysteresis rarely activates at all.

`supports_premise: partial`. Premise rewritten to reflect both findings: hysteresis is workload-conditional, and trip-detection delay belongs to a different mechanism (debouncing).

## Discussion

### Why hysteresis fails on spiky workloads

The dead zone $[L, H] = [H/R, H]$ is only useful when error rate spends time *inside* it after a trip. Spiky workloads are bimodal — error rate is either at baseline (~5%, well below `L` for any ratio in test) or in a spike (~15%, well above `H`). The breaker trips on spike onset, then the spike ends and error rate drops straight through `L` to baseline, fully resetting before the next spike. Each spike contributes one full trip event regardless of ratio.

Bursty and drifting workloads spend time *near* `H`, so a wider dead zone has something to absorb. The flap rate drop on those workloads (2.54 → 1.00, 0.92 → 0.08) is the dead zone working as designed.

This is the workload-conditional truth the original premise didn't anticipate: hysteresis solves a **borderline-noise** problem, not a **distinct-spike** problem.

### Hysteresis vs debouncing

The original premise.then claimed "wider hysteresis delays trip." That conflates two orthogonal mechanisms:

- **Hysteresis** — gap between trip and reset thresholds. Affects flap (state oscillation post-trip) and time-in-open (recovery latency after the spike subsides).
- **Debouncing** — consecutive-sample requirement before a state change fires. Affects trip-detection delay (latency from first breach to actual trip).

The simulator tested hysteresis only. With single-sample trip, trip-detection delay was constant (0 min) regardless of ratio. Wider hysteresis does NOT delay trip; only wider debounce delays trip. The original premise inherited an intuition that combined both and incorrectly attributed the delay axis to hysteresis. Premise rewritten to drop that branch.

### Failure-mode asymmetry

A breaker that flaps fails *loudly* — alerts fire, dashboards light up, on-call gets paged. A breaker that delays trip fails *silently* — the bad state persists into production for an extra few seconds, manifesting as user-facing errors. Different deployment contexts weigh these differently. A user-facing payment service prioritizes low trip-detection delay (silent failure into prod is catastrophic); a batch ingestion job prioritizes low flap rate (every flap costs a queue drain). The "optimal" ratio is therefore deployment-conditional even within a workload class.

### Limitations

- **4 workload classes simplify reality.** Real production workloads are mixtures and transitions between these archetypes; the cost-model harness doesn't compose them.
- **Single-sample trip** is a scope choice that flatlined the delay axis. A follow-up experiment with `(R, debounce_N)` as a 2D matrix would test the wider claim.
- **No adversarial workloads.** A worst-case input (alternating just-above-`H` and just-below-`L` samples) would maximize flap regardless of ratio. The simulator does not generate such patterns.
- **Trip-water fixed at 10%.** The optimal ratio likely depends on the trip-water value too; varying both is future work.
- **Steady-state only.** Cold-start, configuration-change, and cascade-failure scenarios are not modeled.

### Future work

1. Re-run with debouncing as a second axis. Hypothesis: `(R=1.5, debounce_N=3)` outperforms `(R=2.0, debounce_N=1)` on every workload because debouncing absorbs single-sample noise without paying the recovery-latency cost of wide hysteresis.
2. Adversarial-workload generator. Construct minimax inputs that maximize flap against a given (R, debounce_N) configuration; report the ratio's worst case rather than its average case.
3. Apply the simulator to historical incident data from a real service. Replace synthetic generators with replay; check whether a single ratio is recommended across actual workloads or whether per-flag tuning is necessary.

<!-- references-section:begin -->
## References (examines)

**skill — `backend/conditional-feature-flag-rollout`**
feature-flag-shape

**skill — `workflow/circuit-breaker-data-simulation`**
circuit-state-shape

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
counter-evidence

**knowledge — `pitfall/canary-release-implementation-pitfall`**
similar-flap-pattern


## Build dependencies (proposed_builds)

### `hysteresis-tuning-tool`  _(scope: poc)_

**skill — `backend/conditional-feature-flag-rollout`**
flag-control-baseline

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
known-bugs-to-avoid

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Loop closed 2026-04-25 via `/hub-paper-experiment-run` flow + `example/arch/hysteresis-tuning-tool` Monte Carlo simulator (24h × 4 workloads × 5 ratios, deterministic seed=42). Premise rewritten after partial refutation — the directional claim survived, the specific 1.5x-optimum claim was refuted on spiky workloads, and the "wider delays trip" branch was reclassified as a debouncing concern rather than a hysteresis concern. This is the **third closed-loop paper** in the hub (after `workflow/parallel-dispatch-breakeven-point` and `arch/technique-layer-roi-after-100-pilots`).
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration, only section reorganization. Methods + Results subsections that were previously implicit in the cost-model and result narrative are now made explicit.
