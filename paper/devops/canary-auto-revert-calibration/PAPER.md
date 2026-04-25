---
version: 0.2.0-draft
name: canary-auto-revert-calibration
description: "Canary auto-revert thresholds: hypothesis tight thresholds yield more false reverts than true catches"
category: devops
tags: [canary, auto-revert, kpi-threshold, false-positive, hypothesis]
type: hypothesis

premise:
  if: Auto-revert KPI thresholds in a canary rollout are set too tight (e.g. p99 latency threshold within normal noise)
  then: False-positive reverts (rollback healthy releases) exceed true-positives (catching real regressions). The ratio inverts when threshold is widened to ≥2σ above baseline noise.

examines:
  - kind: skill
    ref: workflow/canary-release-data-simulation
    role: canary-shape
  - kind: skill
    ref: backend/conditional-feature-flag-rollout
    role: traffic-control-implementation
  - kind: knowledge
    ref: pitfall/canary-release-implementation-pitfall
    role: counter-evidence
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: similar-flap-failure-mode

perspectives:
  - name: Threshold Tuning is Statistical
    summary: KPI noise has a distribution. Threshold below 2σ catches noise; above 2σ misses small regressions. Single-number thresholds rarely fit the noise envelope.
  - name: True vs False Reverts
    summary: A true revert catches a real regression. A false revert rolls back a healthy build. Both pay the rollout cost; only true reverts pay back. If false:true ratio > 1, auto-revert is net negative.
  - name: Hysteresis as Mitigation
    summary: Adding "trigger if breach for ≥10 minutes" prevents flap but delays detection. The trade-off mirrors circuit-breaker hysteresis.
  - name: Slow-Burn Bugs
    summary: Memory leaks, cache pollution take hours to surface. Canary windows are minutes. Auto-revert never sees them. Threshold calibration is for fast-emerging issues only.

external_refs: []

proposed_builds:
  - slug: canary-threshold-calibration-tool
    summary: Tool that ingests baseline KPI metrics, computes noise distribution, recommends threshold settings (μ + Nσ) per KPI with target false-revert rate. Replays historical incidents to validate.
    scope: poc
    requires:
      - kind: skill
        ref: workflow/canary-release-data-simulation
        role: replay-harness
      - kind: knowledge
        ref: pitfall/canary-release-implementation-pitfall
        role: failure-modes-to-validate-against
        note: failure-modes-to-validate-against

experiments:
  - name: threshold-vs-revert-ratio
    hypothesis: At threshold = baseline + 1σ, false:true revert ratio ≥ 3 (mostly false). At baseline + 2σ, ratio ≈ 1. At baseline + 3σ, ratio ≤ 0.5 (mostly true). Sweet spot is 2-2.5σ.
    method: Replay 50 historical canary deployments (mix of healthy + regressing) at different threshold settings; compute ratios.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Canary Auto-Revert: Calibrating Thresholds

## Introduction

(see frontmatter)

### Background

The `technique/devops/canary-rollout-with-auto-revert` describes the auto-revert shape but specifies thresholds as "configurable" without guidance. This paper proposes the calibration rule.

### Prior art

Datadog, Prometheus, Spinnaker provide KPI monitoring; few document threshold-tuning methodology. Useful research: anomaly detection literature, Tukey fences, EWMA-based thresholds.

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

(see frontmatter)

### Limitations

- Replay-based validation assumes historical data is representative
- "False positive" definition relies on retrospective verdict; some judgment calls
- Slow-burn issues are explicitly out of scope

<!-- references-section:begin -->
## References (examines)

**skill — `workflow/canary-release-data-simulation`**
canary-shape

**skill — `backend/conditional-feature-flag-rollout`**
traffic-control-implementation

**knowledge — `pitfall/canary-release-implementation-pitfall`**
counter-evidence

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
similar-flap-failure-mode


## Build dependencies (proposed_builds)

### `canary-threshold-calibration-tool`  _(scope: poc)_

**skill — `workflow/canary-release-data-simulation`**
replay-harness

**knowledge — `pitfall/canary-release-implementation-pitfall`**
failure-modes-to-validate-against

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
