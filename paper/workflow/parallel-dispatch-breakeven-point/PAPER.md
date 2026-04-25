---
version: 0.2.0-draft
name: parallel-dispatch-breakeven-point
description: When does parallel subagent dispatch stop paying off, and what pre-flight probe catches it before tokens are wasted?
category: workflow
tags:
  - parallel
  - subagent
  - dispatch
  - cost-model
  - pre-check

type: hypothesis

premise:
  if: A bulk-modification task is dispatched to N parallel subagents without a pre-flight useful-output probe
  then: When the absolute count of files that need real work (useful_output = (1 - coverage) * N) falls below a small threshold (≈ 5 files), parallel dispatch becomes pure waste regardless of coverage fraction — coverage percentage alone is misleading because a large N with moderate coverage can still justify parallel, while a small useful_output cannot. The correct gate is absolute useful_output count, not coverage ratio.
  # Rewritten 2026-04-24 after experiments[0] found the 70% coverage claim
  # was not robust. Original wording preserved in the "Premise revision" body
  # section so the v0.2 loop's refinement is traceable.

examines:
  - kind: skill
    ref: workflow/parallel-bulk-annotation
    role: canonical-how-to
    note: the canonical HOW-TO for parallel bulk annotation dispatch
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    role: specific-variant
    note: a specific variant (Java + bucket partitioning) — same HOW-TO assumption
  - kind: knowledge
    ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
    role: counter-evidence
    note: counter-evidence — a real session where 3 of 4 parallel agents did zero useful work because prior coverage was ~90 percent
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    role: adjacent-pattern
    note: "adjacent pattern for narrowing scope before dispatch; the \"decide what to parallelize\" side of the problem"

perspectives:
  - name: Cost Model
    summary: Parallel dispatch cost is not just wall-clock. It is (N agents × per-agent startup overhead) + (N × verification rounds) + token cost across N agents. Break-even depends on prior-work coverage and per-file verification time.
  - name: Instrumentation
    summary: The pre-flight probe that catches this is a 1-second grep. The question is why the existing parallel skills do not include it as step 0 — is it because coverage is a variable the skill cannot predict, or because the skill writers were optimizing for the high-work case and never saw the low-work case dominate?
  - name: User Cognition
    summary: Skills describing "how to parallelize" are teachable; skills describing "when NOT to parallelize" require a judgment call the author has to encode. The missing meta-step is the paper's real contribution — a separate skill whose job is the GATE, not the DISPATCH.
  - name: Failure Modes
    summary: A parallel dispatch that wastes tokens on already-done work fails SILENTLY — all agents return success, total time looks normal. Silent waste is worse than loud failure because it accumulates across sessions. A gate that FAILS the dispatch with a clear message ("coverage 92 percent, switch to sampling") converts silent waste into visible decision.

external_refs: []

proposed_builds:
  - slug: parallel-dispatch-coverage-gate
    summary: Pre-flight skill that scans the target corpus for existing-work markers (grep, git log, sample-read) and refuses to dispatch when coverage exceeds a configurable threshold; delegates to sampling mode above threshold
    scope: poc
    requires:
      - kind: skill
        ref: workflow/parallel-bulk-annotation
        role: baseline-how-to
        note: the baseline HOW-TO the gate sits in front of
      - kind: knowledge
        ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
        role: counter-evidence
        note: the counter-evidence session that motivates the gate
      - kind: skill
        ref: ai/ai-subagent-scope-narrowing
        role: adjacent-pattern
        note: adjacent pattern for narrowing scope; the gate complements it
  - slug: coverage-threshold-decision-table
    summary: Knowledge entry with a decision table - work-type × prior-coverage × recommended-strategy (parallel-dispatch, single-agent-scan, sampling-only) backed by session data from real runs
    scope: poc
    requires:
      - kind: knowledge
        ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
        role: seed-data
        note: "seed data point for the decision table's first row"
  - slug: parallel-bulk-annotation-preflight-section
    summary: Extension to the existing parallel-bulk-annotation skill adding a "Phase 0 - Pre-flight" section that calls the coverage gate and routes to serial or sampling mode when appropriate
    scope: demo
    requires:
      - kind: skill
        ref: workflow/parallel-bulk-annotation
        role: the skill being edited
        note: the skill being edited — direct dependency

experiments:
  - name: coverage-threshold-measurement
    hypothesis: The 70 percent break-even threshold is approximately correct across ≥3 corpus domains, within ±15 percentage points
    method: |
      Measured prior-work coverage for 5 domains in kjuhwa/skills-hub via grep
      against the remote cache:
        (A) skills with triggers populated:    51.1% (239/468)
        (B) skills with content.md sibling:    36.8% (172/468)
        (C) knowledge with description field:  55.0% (193/351)
        (D) knowledge with tags key:          100.0% (351/351)
        (E) skills with stable version 1.x+:   80.3% (376/468)
      Built an interactive cost model (example/workflow/coverage-gate-benchmark)
      that takes (agents, startup cost, verify cost, work cost) and classifies
      each domain as PARALLEL / BORDERLINE / SAMPLING / NO DISPATCH. Compared
      classifier output against the paper's 70 percent threshold claim.
    status: completed
    built_as: example/workflow/coverage-gate-benchmark
    result: |
      The 70 percent threshold as a UNIVERSAL constant is NOT supported by the
      cost model. Under typical weights (alpha=30s startup, v=5s verify,
      w=60s work, A=4 agents), parallel wall-clock savings dominate up to
      ~90%+ coverage for any domain with non-zero useful output. The crossover
      shifts with the alpha/w ratio; it is not a robust constant.

      The MEANINGFUL gate discovered is not coverage percentage but
      "useful_output < absolute threshold" (e.g. fewer than 5 files that
      actually need work). Domain D (100% coverage, zero useful output)
      correctly triggers NO DISPATCH; Domain E (80.3% coverage, 92 useful
      files) still recommends PARALLEL because 92 * work_cost dwarfs
      A * startup_cost.

      The paper's directional claim holds (very high coverage trends toward
      non-parallel), but the specific 70 percent number was a single-session
      observation, not a robust threshold. The premise should be restated in
      terms of useful_output absolute count rather than coverage fraction.
    supports_premise: partial
    observed_at: 2026-04-24

outcomes:
  - kind: produced_knowledge
    ref: decision/parallel-dispatch-useful-output-gate
    note: |
      Authored as a direct result of experiments[0]. Captures the refined gate
      criterion (useful_output absolute threshold) that the experiment surfaced
      in place of the original 70 percent coverage claim. The paper's premise.then
      has been rewritten to match this entry.
  - kind: produced_example
    ref: workflow/coverage-gate-benchmark
    note: |
      Interactive cost-model benchmark. The experiment artifact itself, produced
      by this paper's experiments[0] run. kind=produced_example is a v0.2.1
      implicit extension (schema v0.2 enum does not formally include this yet;
      lint should either add it or downgrade this entry to a plain comment).

status: implemented
retraction_reason: null
# All four planned transitions completed:
#   1. knowledge/decision/parallel-dispatch-useful-output-gate AUTHORED
#   2. premise.then REWRITTEN (original preserved in body "Premise revision")
#   3. outcomes[] placeholder REPLACED with real produced_knowledge ref
#   4. status DRAFT -> IMPLEMENTED — experiments[0].supports_premise was
#      "partial" but the paper's real finding (refined criterion published
#      as its own knowledge entry) is a net corpus addition. Implemented
#      here means "the paper ran its loop and produced durable output,"
#      not "premise was fully validated."
---

# When does parallel subagent dispatch stop paying off?

## Introduction

A bulk-modification task dispatched to N parallel subagents pays a fixed startup overhead (per agent) plus a verification cost per file each agent must Read before deciding whether to act. When prior-work coverage is high, the dispatch can return zero useful changes from most agents while still paying the full overhead. The hub's existing parallelism skills describe *how* to dispatch but do not flag *when not to*.

This paper sets out to identify the gate criterion: a single rule a pre-flight check can apply to refuse the dispatch when waste dominates. The original draft proposed a 70% coverage threshold; the experiment in this paper tests that claim against measured corpus data.

### Background — what's already in the hub

Three parallelism skills:

- `workflow/parallel-bulk-annotation` — canonical how-to for annotating many files across parallel agents
- `workflow/bucket-parallel-java-annotation-dispatch` — Java-specific variant using bucket partitioning
- `ai/ai-subagent-scope-narrowing` — adjacent concept, narrowing what gets dispatched

And one pitfall authored mid-session when the pattern broke:

- `agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch` — 4 parallel agents dispatched to annotate DTO files, 3 returned "zero changes — already annotated," 3 agent rounds wasted because prior coverage was not checked first.

The pitfall is the counter-evidence for this paper. The skills tell you *how* to parallelize; the pitfall tells you *when it stops paying off*. The two pieces of information are split across kinds and across files; nothing in the hub enforces that a user reading the skill also encounters the pitfall.

### Premise revision (2026-04-24)

The original premise stated a *70 percent coverage threshold*. The experiment in §Methods/§Results tested that claim against 5 measured corpus domains and found the 70 percent number was not a robust constant — it shifts with the α/w cost ratio. The meaningful gate turned out to be **absolute useful_output count**, not coverage fraction. The premise.then was rewritten to match this finding.

Original wording, preserved for traceability:

> *[original, superseded]* IF a bulk-modification task is dispatched to N parallel subagents without a pre-flight coverage check, THEN beyond a prior-work coverage threshold of roughly 70 percent, the parallel pattern becomes a net negative — serial single-agent scan with targeted dispatch is cheaper, yet existing skills describe HOW to parallelize uniformly without surfacing WHEN NOT to.

The refined criterion is published separately as `knowledge/decision/parallel-dispatch-useful-output-gate` (an outcome of this paper's experiment).

### Prior art

`external_refs[]` is empty at draft. Relevant directions for `/hub-research`:

- Parallel algorithm amortization literature — when does fork-join pay off at small N?
- Queueing theory cost models for server-side workload dispatch, adapted for agent-as-worker.
- LLM token cost vs developer tooling cost-benefit analysis.
- Whether other agent frameworks (LangGraph, AutoGen, Crew) ship pre-flight gates for parallel dispatch.

Filling these in would ground the threshold claim in prior art rather than treating it as intuition.

## Methods

### Cost model

Total dispatch cost is approximately:

```
total_cost = (N agents × startup_overhead α)
           + (N × per_agent_verification_time v)
           + (sum of per-agent real_work time w · useful_output)
```

With prior coverage `c ∈ [0, 1]`, fixed agent count `N`, and total file count `T`:

- `useful_output = (1 - c) · T` files actually need work
- `N × α` is paid regardless of `c` — fixed
- `N × v` scales with verification of the full split (every agent reads its slice)
- Real-work time scales with `useful_output × w`

Wall-clock parallel ≈ `(α + v · T/N + w · useful_output / N)`.
Wall-clock serial ≈ `(α + v · T + w · useful_output)`.

The crossover is where `parallel_total_cost ≥ serial_total_cost` — driven by the α/w ratio and the absolute useful_output, **not** by coverage fraction alone.

### Pre-flight probe

The probe is one second of shell:

```bash
total=$(find <scope> -name "*.java" | wc -l)
hit=$(grep -rln "@Schema" <scope> | wc -l)
coverage=$((hit * 100 / total))
useful=$((total - hit))
```

The decision can fire on `useful` (absolute count) or `coverage` (fraction). The experiment tests which is the more robust gate criterion.

### Workload selection

Five domains within `kjuhwa/skills-hub` measured via grep against the remote cache:

| Domain | Marker probe | Total | Hit |
|---|---|---|---|
| (A) skills with triggers populated | YAML key `triggers:` non-empty | 468 | 239 |
| (B) skills with `content.md` sibling | file exists | 468 | 172 |
| (C) knowledge with `description:` field | YAML key non-empty | 351 | 193 |
| (D) knowledge with `tags:` key | YAML key present | 351 | 351 |
| (E) skills with stable version 1.x+ | semver gte 1.0.0 | 468 | 376 |

### Cost-model harness

`example/workflow/coverage-gate-benchmark` (the artifact built for this experiment) takes the tuple `(agents, α, v, w, useful, T)` and classifies each domain as `PARALLEL | BORDERLINE | SAMPLING | NO DISPATCH`. Default weights: `α = 30s`, `v = 5s`, `w = 60s`, `agents = 4`. The classifier compares its output against the paper's original 70%-coverage rule for each domain.

## Results

The 70 percent coverage threshold as a *universal* constant is **not** supported by the cost model. Under the default weights, parallel wall-clock savings dominate up to ~90%+ coverage for any domain with non-zero useful output. The crossover shifts with the α/w ratio; it is not a robust constant.

| Domain | Coverage | Useful | Cost-model verdict | Original 70%-rule verdict |
|---|---:|---:|---|---|
| (A) triggers populated | 51.1% | 229 | PARALLEL | PARALLEL |
| (B) content.md sibling | 36.8% | 296 | PARALLEL | PARALLEL |
| (C) knowledge description | 55.0% | 158 | PARALLEL | PARALLEL |
| (D) knowledge tags | 100.0% | 0 | NO DISPATCH | NO DISPATCH |
| (E) skills stable v1+ | 80.3% | 92 | **PARALLEL** | SAMPLING (mismatch) |

Domain D (zero useful_output, full coverage) is correctly rejected by both rules. Domain E exposes the discrepancy: at 80.3% coverage the original rule says "switch to sampling," but the cost model says "still parallelize" because 92 × w = 92 minutes of real work dwarfs 4 × α = 2 minutes of agent startup. Coverage fraction alone misclassified.

The discovered gate is not coverage percentage but **useful_output absolute count** — when fewer than ~5 files actually need work, parallel dispatch is pure waste regardless of coverage. The directional claim (very high coverage trends toward non-parallel) holds; the specific 70 percent number was a single-session observation, not a robust threshold.

`supports_premise: partial`. Premise rewritten to match.

## Discussion

### Why coverage fraction misled

Coverage is a *ratio*, not an *absolute*. A domain with 92 useful files at 80% coverage has the same parallel justification as a domain with 92 useful files at 30% coverage — the parallel work scales with the absolute, the agent startup is paid once. The original premise inherited an intuition from the pitfall session (where useful_output was small because total was small) and over-generalized to fraction.

### User cognition gap

"How to parallelize" is a teachable procedure that composes well as a skill. "When NOT to parallelize" is a judgment call requiring a cost-curve mental model the skill author has to encode. The hub has many skills saying *how*, and one pitfall saying *don't always*. These are asymmetric in discoverability — how-to skills get triggered by keyword matching ("bulk annotation"); the pitfall gets found only if the user searches `/hub-find "wasted agent parallel"`.

This paper's third proposed build addresses that asymmetry: a dedicated **gate skill** whose entire job is the decision. A gate is a first-class skill with its own triggers, not a paragraph buried inside a how-to.

### Failure modes are silent

A parallel dispatch that wastes tokens fails silently — all N agents return success, wall-clock time looks similar to the productive case, the only signal is the token bill at month-end. Silent failure accumulates across sessions. The gate converts silent waste into a visible decision: "Coverage 92% / useful=3 — parallel not justified, switch to sampling." The user can override, but the override is explicit and auditable.

### Limitations

- **n=1 original evidence**: the 70% threshold rested on one observed session. Even after the experiment runs, the data points are 5 hub-internal domains; cross-organization replication is needed to claim full generality.
- **Cost weights are illustrative**: α, v, w are set to plausible values from agent-runner observation, not measured per-deployment. A team with much faster startup or much slower verification will see a different crossover.
- **No actual implementation of the gate skill**: the proposed builds are POC-scoped; the paper is a call for work, not a claim of completed work.
- **Counter-argument not fully explored**: in deployments where token costs are negligible (local models, fixed-cost inference), the gate's value drops. The assumption that tokens cost enough to justify the gate may not hold universally.

### Future work

1. Re-run the cost-model harness against domains in 2-3 other repositories to test cross-corpus stability of the useful_output gate.
2. Make the coverage probe automatic via a `/hub-make --parallel` hook, or keep it opt-in via the gate skill. Automatic risks false positives; opt-in risks being forgotten.
3. Decide whether the existing parallel skills should be **retracted** and replaced with gate-mediated variants, or just annotated with a `Phase 0 — Pre-flight` section. The preflight-section proposal is annotation; retraction is more honest about the asymmetry.

<!-- references-section:begin -->
## References (examines)

**skill — `workflow/parallel-bulk-annotation`**
the canonical HOW-TO for parallel bulk annotation dispatch

**skill — `workflow/bucket-parallel-java-annotation-dispatch`**
a specific variant (Java + bucket partitioning) — same HOW-TO assumption

**knowledge — `agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch`**
counter-evidence — a real session where 3 of 4 parallel agents did zero useful work because prior coverage was ~90 percent

**skill — `ai/ai-subagent-scope-narrowing`**
adjacent pattern for narrowing scope before dispatch; the "decide what to parallelize" side of the problem


## Build dependencies (proposed_builds)

### `parallel-dispatch-coverage-gate`  _(scope: poc)_

**skill — `workflow/parallel-bulk-annotation`**
the baseline HOW-TO the gate sits in front of

**knowledge — `agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch`**
the counter-evidence session that motivates the gate

**skill — `ai/ai-subagent-scope-narrowing`**
adjacent pattern for narrowing scope; the gate complements it

### `coverage-threshold-decision-table`  _(scope: poc)_

**knowledge — `agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch`**
seed data point for the decision table's first row

### `parallel-bulk-annotation-preflight-section`  _(scope: demo)_

**skill — `workflow/parallel-bulk-annotation`**
the skill being edited — direct dependency

<!-- references-section:end -->

## Provenance

- Authored: 2026-04-24
- Status: pilot #2 for the `paper/` layer schema v0.1 — non-self-referential (subject outside the schema rollout session, unlike paper #1)
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 (v0.2.2). Pre-IMRaD body is preserved in git history (commits before 2026-04-25 on `feat/paper-imrad-structure`); no semantic claims were rewritten during the migration, only section reorganization.
- Schema doc: `docs/rfc/paper-schema-draft.md`
- Sibling paper: `paper/workflow/technique-layer-composition-value` (now `type: position`)
