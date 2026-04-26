---
version: 0.2.0-draft
name: safe-bulk-pr-anchor-phase-necessity
description: "Is the rollback-anchor pre-flight phase in safe-bulk-pr-publishing necessary for all N, or only at scale?"
category: workflow
tags:
  - bulk-pr
  - rollback-anchor
  - phase-necessity
  - hypothesis
  - recovery-cost

type: hypothesis

premise:
  if: A team applies safe-bulk-pr-publishing to N>1 PRs but skips the rollback-anchor pre-flight phase
  then: Recovery time after publish failure grows O(N) instead of O(1) — without anchor tag, rollback requires per-PR revert. Anchor is necessary for any N>1, not just large N.

examines:
  - kind: technique
    ref: workflow/safe-bulk-pr-publishing
    role: subject
    note: subject technique whose anchor-phase necessity is interrogated
  - kind: skill
    ref: workflow/parallel-build-sequential-publish
    role: orchestrator-under-test
    note: orchestrator atom whose recovery shape depends on anchor presence
  - kind: skill
    ref: workflow/rollback-anchor-tag-before-destructive-op
    role: anchor-atom
    note: the anchor atom itself; its presence vs absence is the experimental variable
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    role: secondary-recovery
    note: existing batch-merge recovery may partly compensate for missing anchor
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: orthogonal-prior
    note: orthogonal cost-displacement paper; this paper picks a necessity shape

perspectives:
  - name: Recovery-Time Decomposition
    summary: With anchor — recovery is single tag-checkout, O(1) regardless of N. Without anchor — recovery walks each merged PR, reverts individually, reconciles catalog file, O(N) per-PR cost dominates.
  - name: Per-PR Revert Cost
    summary: Revert cost per PR = find-merge + checkout + revert + push + catalog reconcile. Each step small but linear in PR count. At N=20+, cumulative cost exceeds anchor-tag setup by 10-50x.
  - name: False Savings
    summary: Skipping anchor saves ~5 seconds upfront. On publish failure (routine with 10+ PRs), savings invert. Net negative when failure rate × N × revert-time > anchor setup time.
  - name: Counter-Argument — Small N
    summary: For N=2-3, manual revert via git CLI is fast and humans tolerate it. Anchor overhead may be unjustified at small N. The technique's anti_conditions don't currently distinguish; should they?

external_refs: []

proposed_builds:
  - slug: anchor-recovery-benchmark
    summary: Replay 5 historical bulk-publish operations × 2 variants (anchor vs skip). Inject failure at midpoint. Measure recovery wall-clock + manual intervention count + catalog reconciliation rounds.
    scope: poc
    requires:
      - kind: skill
        ref: workflow/rollback-anchor-tag-before-destructive-op
        role: anchor-atom-baseline
        note: the anchor atom whose presence drives recovery shape
      - kind: technique
        ref: workflow/safe-bulk-pr-publishing
        role: subject
        note: technique whose phase necessity is benchmarked
  - slug: revert-cost-decomposition
    summary: Break per-PR revert into (find-merge + checkout + revert + push + reconcile) cost components. Identify which step dominates and whether automation collapses the ladder.
    scope: poc
    requires:
      - kind: skill
        ref: workflow/parallel-build-sequential-publish
        role: orchestrator-context
        note: orchestrator atom that determines what state the recovery must walk back through
  - slug: anchor-skip-incidence-survey
    summary: Across teams using the technique, how often is anchor actually skipped vs followed? Survey of git logs from teams that ran bulk-publish operations — quantifies real-world skip rate.
    scope: poc
    requires:
      - kind: knowledge
        ref: workflow/batch-pr-conflict-recovery
        role: secondary-recovery-baseline
        note: existing recovery may partially compensate; survey baseline reference

experiments:
  - name: anchor-phase-necessity-measurement
    hypothesis: Across 5 bulk-publish ops × 2 variants (anchor vs skip), recovery without anchor exceeds with anchor by ≥10x at N≥10. Below N=5, difference is <2x and may be irrelevant.
    method: |-
      5 historical bulk-publish ops × 2 variants (anchor present / skipped).
      Inject failure midpoint. Measure recovery wall-clock, manual
      interventions, catalog reconcile rounds. See body §Methods.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Safe-Bulk-PR Anchor-Phase Necessity

## Introduction

The `workflow/safe-bulk-pr-publishing` technique's body lists rollback-anchor as the pre-flight (phase 0) of its 4-stage pipeline. The anchor's role is to establish a single tag-checkout recovery point before any destructive operation. The technique treats this as foundational, but does not measure recovery cost when the anchor is skipped.

This paper interrogates the necessity claim. The premise predicts O(N) recovery cost without anchor vs O(1) with anchor — a deterministic step difference, not a continuous degradation curve.

### Background

The subject technique was authored without a v0.2 `recipe:` block (it's one of the 13 v0.1-only techniques tracked by issue #1172). Until that migration completes, this paper interrogates the technique by referencing prose in the technique body's `## Phase sequence` section rather than a structured `recipe.assembly_order` field. After #1172 lands, this paper's premise can be tightened to cite the specific phase by structured field.

The prior paper `workflow/parallel-dispatch-breakeven-point` examined a cost-displacement shape on a different axis (parallel agent count). This paper is **deliberately a necessity claim** rather than another cost-displacement shape — continuing the survey paper's (#1157) bias-test pattern initiated in `paper/workflow/soft-convention-phase-ordering-necessity` (#1160).

### What this paper sets out to test

Whether the anchor phase is necessary at all N>1, or only at large N — and whether the technique's anti_conditions should distinguish small-N runs from large-N runs.

## Methods

(planned — see `experiments[0].method` for the measurement skeleton)

The experimental harness replays 5 historical bulk-publish operations from teams using safe-bulk-pr-publishing. For each operation, two variants run:

- **anchor-present**: canonical phase 0 anchor tag created before publish
- **anchor-skipped**: phase 0 omitted; publish starts from current HEAD

For each (operation × variant) cell, simulate publish-failure at midpoint:
- Half the PRs already merged
- Auto-merge cascade in progress
- Recovery initiates

Measurements per cell:
- **Wall-clock to revert**: time until repo is back at pre-publish state
- **Manual interventions**: human decisions required (PR conflict resolution, catalog reconcile)
- **Catalog reconcile rounds**: how many times the central catalog file (registry/index) needs re-merging

Total cells: 5 operations × 2 variants = **10 cells**, deterministic seed via fixed git histories.

### Recovery-cost model

```
anchor_present_cost = tag_checkout + force_push  ≈ O(1)
anchor_absent_cost  = sum(per_pr_revert) + catalog_reconcile_per_pr ≈ O(N)
```

Where `per_pr_revert ≈ find_merge_commit + checkout + revert + push + catalog_reconcile`.

The hypothesis predicts the ratio `anchor_absent_cost / anchor_present_cost ≥ 10x` at N≥10 and `<2x` at N≤5.

## Results

(pending — experiment status is `planned`; this paper is in draft state. Will be populated when the benchmark runs and `/hub-paper-experiment-run` closes the loop.)

## Discussion

(pending)

The expected finding shape: a clear necessity result for N≥10 (anchor saves ≥10x recovery time), an ambiguous result for N=5-10 (anchor probably worth it but not load-bearing), and an over-engineering signal for N≤3 (anchor's setup cost may exceed expected recovery cost given low failure probability).

If supported, the technique's `recipe.anti_conditions` (when added per #1172) should distinguish small-N runs and recommend anchor-skip as acceptable below some threshold. If refuted (anchor pays off even at N=2), the existing technique recipe is correct and no anti_condition refinement is needed.

If unexpectedly the anchor-skipped variant performs equivalently because batch-pr-conflict-recovery (the secondary recovery mechanism) compensates fully — then the anchor atom itself may be removable from the technique. That would be a stronger refute.

### Limitations

- 5 historical operations is small N. Statistical power is low.
- "Inject failure at midpoint" is one failure pattern. Real failures cluster at start (auth/permission errors) or near end (rate limit, race conditions). The midpoint-failure assumption may bias results.
- Recovery cost is human-intervention dominated; wall-clock measurement masks operator skill differences.
- The "anchor-skipped" variant assumes a team would skip *all* of phase 0, not just the tag creation. Real teams may skip differently (skip tag but keep dry-run, etc.). Permutations of partial skipping are not measured.
- Until #1172 lands, the technique's phase ordering is prose-only — replay must reconstruct it from body text rather than structured `assembly_order`.

### Future work

1. Run replay benchmark first to establish baseline cost ratio per N. Decide whether to invest in real-PR experiments (riskier, slower).
2. After #1172 migrates safe-bulk-pr-publishing to v0.2 recipe block, tighten this paper's premise to cite `recipe.assembly_order[0]` directly instead of the prose reference.
3. Decompose recovery cost into automation-collapsible vs human-required steps. If most steps automate cleanly, the anchor's value reduces to "save 5 seconds × failure_probability × N" — a much smaller benefit.
4. Tie back to the cost-displacement survey (#1157). This paper is the second deliberate non-cost-displacement counter-example (after #1160). Two diversifications strengthens the survey's ability to test bias.

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/safe-bulk-pr-publishing`**
subject technique whose anchor-phase necessity is interrogated

**skill — `workflow/parallel-build-sequential-publish`**
orchestrator atom whose recovery shape depends on anchor presence

**skill — `workflow/rollback-anchor-tag-before-destructive-op`**
the anchor atom itself; its presence vs absence is the experimental variable

**knowledge — `workflow/batch-pr-conflict-recovery`**
existing batch-merge recovery may partly compensate for missing anchor

**paper — `workflow/parallel-dispatch-breakeven-point`**
orthogonal cost-displacement paper; this paper deliberately picks a necessity shape instead


## Build dependencies (proposed_builds)

### `anchor-recovery-benchmark`  _(scope: poc)_

**skill — `workflow/rollback-anchor-tag-before-destructive-op`**
the anchor atom whose presence drives recovery shape

**technique — `workflow/safe-bulk-pr-publishing`**
technique whose phase necessity is benchmarked

### `revert-cost-decomposition`  _(scope: poc)_

**skill — `workflow/parallel-build-sequential-publish`**
orchestrator atom that determines what state the recovery must walk back through

### `anchor-skip-incidence-survey`  _(scope: poc)_

**knowledge — `workflow/batch-pr-conflict-recovery`**
existing recovery mechanism that may partially compensate; survey baseline reference

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Subject: `paper/from-technique` against `technique/workflow/safe-bulk-pr-publishing` (v0.1 technique, awaiting #1172 migration)
- Status: draft — `experiments[0]` is planned; the paper will move to `status=implemented` once the replay benchmark runs
- **Second deliberate non-cost-displacement shape** (after `paper/workflow/soft-convention-phase-ordering-necessity` #1160). Continues the survey paper's (#1157) bias-test pattern.
- Refs: #1172 (issue tracking the v0.1→v0.2 migration that would tighten this paper's premise reference)
