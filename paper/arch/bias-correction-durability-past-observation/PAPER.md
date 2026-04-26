---
version: 0.3.0-draft
name: bias-correction-durability-past-observation
description: "Tests whether single-author bias-correction holds past active observation — durability sub-question."
type: hypothesis
status: draft
category: arch
tags:
  - self-improvement
  - bias-correction
  - durability
  - corpus-meta
  - observation-effect

premise:
  if: "an author authors N=10 additional papers after the active-observation period of #1200/#1205, without per-PR adherence tracking"
  then: "adherence to the non-cost-displacement rule stays ≥80% — sustained behavior change, not single-iteration effect under observation"

examines:
  - kind: paper
    ref: arch/author-bias-self-correction-feasibility
    note: "first self-improvement paper — feasibility sub-question (existence)"
  - kind: paper
    ref: arch/cluster-formation-dynamics-from-bias-correction
    note: "second self-improvement paper — emergent corpus structure (variant)"

perspectives:
  - by: corpus-curator
    view: "if durability fails, the methodology needs standing infrastructure (PR templates, lint rules, periodic re-survey). If it holds, awareness alone suffices once internalized."
  - by: skeptic
    view: "11 papers under active observation already shows 100% — but observation is the variable. Predict drift returns within 5 unwatched papers. Author can't observe themselves authoring."
  - by: empiricist
    view: "current N=11 with 100% under observation is data, not yet proof. Genuine durability requires active observation OFF — measure as papers accumulate naturally."

experiments:
  - name: post-observation-adherence-tracking
    status: planned
    method: "Wait until N=21 papers (10 more after #1207); score adherence on the new 10. PRs MUST NOT mention bias-correction or ratio gap. Compare to active-observation baseline. Full protocol in body."
    measured: "adherence rate on N=10 unwatched follow-ups; ratio-gap progression; defection count + cause"
    result: null
    supports_premise: null
    refutes: "implicit assumption that the 100% adherence at N=11 generalizes past active observation"
    confirms: null

requires:
  - kind: paper
    ref: arch/author-bias-self-correction-feasibility
    note: "first self-improvement paper — establishes baseline for durability comparison"
  - kind: paper
    ref: arch/cluster-formation-dynamics-from-bias-correction
    note: "second self-improvement paper — pairs with this PR to complete the self-improvement cluster"
---

# Bias-Correction Durability Past Active Observation

> Tests whether single-author bias-correction holds when active observation relaxes. **Third self-improvement paper** — completes the self-improvement cluster with #1200 (feasibility) and #1205 (emergent corpus structure). Direct closure of #1200's open question: "durability past N=5 untested."

## Introduction

Paper #1200 (`author-bias-self-correction-feasibility`) demonstrated that single-author bias-correction reaches 100% adherence at N=5 papers. Paper #1205 (`cluster-formation-dynamics`) extended to N=9 with 100% maintained. By the time of this paper's authoring, adherence is **100% across N=11** (worked examples #1194 through #1207) — every paper deliberately framed around the technique's actual shape, no defections.

But there's a confound: every one of those 11 papers was authored under **active observation**. Each PR description tracked adherence explicitly. Each commit message named the worked-example index. The ratio gap was reported in every PR body. The author was watching themselves at every step.

This paper tests the open question that #1200 explicitly named: **does adherence hold past active observation?**

### Self-improvement cluster sub-question triad

This paper completes the self-improvement cluster with the three natural sub-questions:

| Paper | Sub-question | Status |
|---|---|---|
| #1200 author-bias-self-correction-feasibility | **Feasibility** — does it work at all under observation? | implemented (yes, 100% at N=5) |
| #1205 cluster-formation-dynamics | **Structure** — what corpus shape emerges? | implemented (3-paper saturation per category) |
| **this paper** | **Durability** — does it hold past observation? | draft (open question, not yet measurable) |

This completes the self-improvement category as the **fourth stable 3-paper cluster** (after threshold-cliff, necessity, Pareto). Per #1205's verdict on cluster saturation, the triad covers the natural sub-question space for self-improvement.

### Why this is not yet measurable

True durability requires active observation OFF. The author CANNOT observe themselves authoring without re-engaging the observation that the test is meant to remove. The honest closure path: **wait until N=21 papers accumulate naturally** (10 more after #1207) without per-PR adherence tracking, then retroactively score adherence on the unwatched 10.

This paper's status remains `draft` until that data exists. The hypothesis is filed; the experiment is calendar-bound, not effort-bound.

## Methods

Phased over future calendar time:

1. **Now** (post-#1207): file this paper as draft. Do NOT include adherence tracking in subsequent PRs (#1208+).
2. **Wait**: 10 papers (#1208 through #1217) accumulate naturally as authoring continues.
3. **Score** (after #1217): retroactively classify each new paper's primary shape. Compute adherence: % that frame around technique's actual shape, not cost-displacement.
4. **Compare**: adherence in unwatched window (this experiment) vs adherence in watched window (#1200's data, 100% at N=5).

Hypothesis confirmed if unwatched adherence ≥ 80% (slight relaxation from 100% to allow normal drift).

### What this paper is NOT measuring

- **Single-paper drift events** — N=10 needed to detect pattern, not single defection
- **Author-conscious correction** — if author notices they almost defaulted to crossover and correct, that COUNTS as adherence (the rule fires); only completed-and-merged crossover papers count as defection
- **Multi-author durability** — single author scope; multi-author requires its own paper
- **Duration scaling** — N=10 unwatched may differ from N=20 or N=50 unwatched. This paper bounds at N=10.

## Results

`status: draft` — experiment is calendar-bound. Result will populate after #1217 (10 unwatched papers from now).

Expected output table (template):

| Paper window | N | Observation | Adherence | Notes |
|---|---:|---|---:|---|
| #1194-#1198 (active) | 5 | high | 100% | from #1200 |
| #1194-#1207 (cumulative) | 11 | high | 100% | through this PR |
| #1208-#1217 (unwatched) | 10 | low/absent | TBD | this experiment |

## Discussion

### Why this matters for the methodology

If durability holds (≥80%):
- Paper #1188's bias-detection methodology is **self-sustaining once activated**
- Active observation needed only at startup; can fade after
- Methodology cost: one survey + initial cluster + monitoring (low ongoing)

If durability fails (<80%):
- Methodology requires **standing infrastructure** — PR templates with adherence checklists, lint rules, periodic re-surveys
- Active observation is not a phase, it is the maintenance regime
- Methodology cost: ongoing per-PR overhead

These are operationally distinct outcomes. The corpus's value-per-effort calculus changes meaningfully depending on which holds.

### What would refute the hypothesis

- Adherence in unwatched N=10 drops below 80% → durability fails; standing infrastructure needed
- Single hard defection in unwatched window even if rate is 90% → the bias is NOT extinct; active observation just suppressed it
- Adherence holds but cluster-formation collapses (papers don't form 3-paper clusters anymore) → adherence and cluster behavior decouple; durability is partial

### What partial-support would look like

- Unwatched adherence at 80-90% (vs 100% watched) → bias partially returns; small-cost intervention (e.g. PR template reminder) sufficient
- First 5 unwatched papers hold, papers 6-10 drift → durability has a half-life; periodic re-survey calibrates the methodology

## Limitations (planned)

- **Author can't blind themselves** — knowing this experiment exists is itself a form of meta-observation. The honest mitigation: don't reference this experiment in PRs #1208-#1217 either.
- **Topic concentration risk** — if the next 10 papers all happen to interrogate non-CD techniques (because the corpus is becoming non-CD-heavy), adherence is artificially easy. Mix in technique audits where cost-displacement framing is plausibly correct.
- **No control author** — the test compares same-author observed-vs-unobserved. A different-author baseline would strengthen but is out of scope.
- **Calendar-bound** — needs 10 more papers worth of natural authoring time. May take weeks or months. Cannot accelerate without compromising the unobserved condition.

## Provenance

- Authored: 2026-04-26 (post-#1207 Pareto cluster completion)
- Status `draft` — experiment is calendar-bound, not effort-bound. Cannot close without N=10 unobserved papers.
- **Third and final self-improvement paper** — completes the self-improvement cluster as the **FOURTH stable 3-paper cluster** (after threshold-cliff #1196/#1197/#1198, necessity #1160/#1174/#1204, Pareto #1176/#1203/#1207)
- Direct closure of paper #1200's open question: "durability past N=5 untested"
- Closure path: wait until paper count reaches N=21 (10 more), retroactively score, transition status to `reviewed` then `implemented`
- Sibling paper opportunity: multi-author durability comparison once another author engages with the methodology
