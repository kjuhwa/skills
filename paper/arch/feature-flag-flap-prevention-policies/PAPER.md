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

## Premise

(see frontmatter)

## Background

`technique/arch/feature-flag-killswitch-with-circuit-state` documents the breaker shape but specifies hysteresis as "operator-tuned." This paper proposes the tuning rule.

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

## Perspectives

(see frontmatter)

## Limitations

- 4 workload classes simplify reality
- Replay-based simulation may miss adversarial workload patterns
- Optimal ratio depends on whether trip-detection delay or flap is the more expensive failure mode in the specific deployment

## Provenance

- Authored 2026-04-25, batch of 10
- Loop closed 2026-04-25 via `/hub-paper-experiment-run` flow + `example/arch/hysteresis-tuning-tool` Monte Carlo simulator (24h × 4 workloads × 5 ratios, deterministic seed=42). Premise rewritten after partial refutation — the directional claim survived, the specific 1.5x-optimum claim was refuted on spiky workloads, and the "wider delays trip" branch was reclassified as a debouncing concern rather than a hysteresis concern. This is the **third closed-loop paper** in the hub (after `workflow/parallel-dispatch-breakeven-point` and `arch/technique-layer-roi-after-100-pilots`).
