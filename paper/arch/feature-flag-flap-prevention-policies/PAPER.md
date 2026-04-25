---
version: 0.2.0-draft
name: feature-flag-flap-prevention-policies
description: "Feature flag breakers flap; hypothesis hysteresis ratio 1.5-2x is optimal — narrower flaps, wider delays trip"
category: arch
tags: [feature-flag, circuit-breaker, hysteresis, flap, hypothesis]
type: hypothesis

premise:
  if: A feature flag has a circuit breaker tied to error rate
  then: Single-threshold breakers flap (open / close repeatedly at the threshold edge). Hysteresis (high-water trip / low-water reset) prevents flap but delays trip. Optimal hysteresis ratio is 1.5-2x (low-water = trip-water / 1.5); narrower causes flap, wider delays trip detection unacceptably.

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
    method: Replay 24h of historical error-rate data per workload class; simulate at each ratio; tabulate.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Feature Flag Flap-Prevention Policies

## Premise

(see frontmatter)

## Background

`technique/arch/feature-flag-killswitch-with-circuit-state` documents the breaker shape but specifies hysteresis as "operator-tuned." This paper proposes the tuning rule.

## Perspectives

(see frontmatter)

## Limitations

- 4 workload classes simplify reality
- Replay-based simulation may miss adversarial workload patterns
- Optimal ratio depends on whether trip-detection delay or flap is the more expensive failure mode in the specific deployment

## Provenance

- Authored 2026-04-25, batch of 10
