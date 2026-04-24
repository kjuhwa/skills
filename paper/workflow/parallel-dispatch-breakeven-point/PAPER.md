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
    role: the canonical HOW-TO for parallel bulk annotation dispatch
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    role: a specific variant (Java + bucket partitioning) — same HOW-TO assumption
  - kind: knowledge
    ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
    role: counter-evidence — a real session where 3 of 4 parallel agents did zero useful work because prior coverage was ~90 percent
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    role: adjacent pattern for narrowing scope before dispatch; the "decide what to parallelize" side of the problem

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
        role: the baseline HOW-TO the gate sits in front of
      - kind: knowledge
        ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
        role: the counter-evidence session that motivates the gate
      - kind: skill
        ref: ai/ai-subagent-scope-narrowing
        role: adjacent pattern for narrowing scope; the gate complements it
  - slug: coverage-threshold-decision-table
    summary: Knowledge entry with a decision table - work-type × prior-coverage × recommended-strategy (parallel-dispatch, single-agent-scan, sampling-only) backed by session data from real runs
    scope: poc
    requires:
      - kind: knowledge
        ref: agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch
        role: seed data point for the decision table's first row
  - slug: parallel-bulk-annotation-preflight-section
    summary: Extension to the existing parallel-bulk-annotation skill adding a "Phase 0 - Pre-flight" section that calls the coverage gate and routes to serial or sampling mode when appropriate
    scope: demo
    requires:
      - kind: skill
        ref: workflow/parallel-bulk-annotation
        role: the skill being edited — direct dependency

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

## Premise

**If** a bulk-modification task is dispatched to N parallel subagents without a pre-flight **useful-output** probe, **then** when `useful_output = (1 - coverage) * N` falls below a small absolute threshold (≈ 5 files), parallel dispatch becomes pure waste **regardless of coverage percentage**. Coverage alone is misleading because a large N at moderate coverage can still justify parallel, while a small useful_output cannot.

This is a cost-model claim, and a tooling claim. The cost model says there is a break-even point determined by useful_output against agent startup overhead. The tooling claim says the hub has the HOW-TO but not the GATE — the decision that must happen *before* the HOW-TO fires.

### Premise revision (2026-04-24)

The original premise stated a **"70 percent coverage threshold"**. The `coverage-threshold-measurement` experiment (see `experiments[0]`, built as `example/workflow/coverage-gate-benchmark`) tested that claim against 5 measured corpus domains and found the 70 percent number was not a robust constant — it shifts with the α / w cost ratio. The meaningful gate turned out to be **absolute useful_output count**, not coverage fraction.

The revised premise above uses that refined criterion. The original wording is preserved here for traceability:

> **[original, superseded]** IF a bulk-modification task is dispatched to N parallel subagents without a pre-flight coverage check, THEN beyond a prior-work coverage threshold of roughly 70 percent, the parallel pattern becomes a net negative — serial single-agent scan with targeted dispatch is cheaper, yet existing skills describe HOW to parallelize uniformly without surfacing WHEN NOT to.

The refined criterion is published separately as `knowledge/decision/parallel-dispatch-useful-output-gate`.

## Background

The hub already carries multiple skills on parallel subagent dispatch for bulk work:

- `workflow/parallel-bulk-annotation` — the canonical how-to for annotating many files across parallel agents
- `workflow/bucket-parallel-java-annotation-dispatch` — a Java-specific variant using bucket partitioning
- `ai/ai-subagent-scope-narrowing` — the adjacent concept of narrowing what gets dispatched

And one pitfall, authored mid-session when the pattern broke under it:

- `agent-orchestration/grep-existing-annotations-before-parallel-subagent-dispatch` — a real session where 4 parallel agents were dispatched to annotate DTO files, 3 returned "zero changes — already annotated," and the user paid for 3 wasted agent rounds because prior coverage was not checked first.

The pitfall is the counter-evidence for this paper. The skills tell you *how* to parallelize; the pitfall tells you *when it stops paying off*. The two pieces of information are split across kinds and across files, and nothing in the hub enforces that a user reading the skill also encounters the pitfall.

## Perspectives

### 1. Cost Model

Naïve intuition: parallel dispatch is faster, so parallel dispatch is cheaper. This is wall-clock reasoning.

The actual cost is roughly:

```
total_cost = (N agents × startup_overhead)
           + (N × per_agent_verification_time)
           + (sum of per-agent token spend)
```

If prior coverage is `c` (fraction of files already done):

- `N × startup_overhead` is paid regardless of `c`. Fixed.
- `N × verification_time` grows with `c` because agents still Read → analyze → conclude "nothing to change."
- Token spend scales with `(1 - c) × real_work` plus `c × verification_noise`.

At `c = 0`, parallel wins by a large margin (all agents do real work).
At `c = 1`, parallel pays the fixed cost for zero output — pure waste.
Somewhere between, the line crosses. The pitfall observed `c ≈ 0.9` in practice and the crossover hit hard.

The threshold is not universal — it depends on the ratio of verification time to real-work time per file. Java DTOs with heavy compile-check verification push the break-even down (closer to `c = 0.5`). Simple text edits push it up (closer to `c = 0.8`).

### 2. Instrumentation

The probe that catches the bad case is cheap:

```bash
# What fraction of target files already carry the marker?
total=$(find <scope> -name "*.java" | wc -l)
hit=$(grep -rln "@Schema" <scope> | wc -l)
coverage=$((hit * 100 / total))
```

This is one second of shell, run before any subagent starts. It is not in any of the parallel skills currently in the hub.

Two possible reasons:

1. **Coverage is a variable the skill cannot predict ahead of time**, so it was omitted as out of scope.
2. **The skill was authored for the common case** (a fresh codebase with little prior coverage), and the tail case (high prior coverage) was never observed by the author — until the session that produced the pitfall.

Both are reasonable. Neither is an argument against adding the probe; they are reasons the probe was not there yet.

### 3. User Cognition

"How to parallelize" is a teachable procedure — N agents, split the input, collect results. It composes well as a skill because it is a procedure.

"When NOT to parallelize" is a judgment call. To encode it, the skill author has to carry a mental model of the cost curve and express the threshold as a rule. That is harder to write, and easier to get wrong.

The result: the hub has many skills saying *how*, and one pitfall saying *don't always*. These are not symmetric. The how-to skills get triggered by keyword matching ("bulk annotation"); the pitfall gets found only if the user happens to search `/hub-find "wasted agent parallel"`. The pitfall's discoverability is much lower than the risk it documents.

This paper's third proposed build addresses the asymmetry directly: a dedicated **gate skill** whose entire job is the decision. A gate is a first-class skill with its own triggers and `description`, not a paragraph buried inside a how-to. Its purpose is to be found first.

### 4. Failure Modes

A parallel dispatch that wastes tokens fails **silently**:

- All N agents return success.
- Wall-clock time looks similar to the productive case.
- The only signal is a token bill at month-end, or an observant user noticing `Agent 2 modified 0 files, Agent 3 modified 0 files` in the logs.

Silent failure accumulates across sessions. A user who has been bitten once learns to probe — but only for this one domain. They don't generalize.

Loud failure is rarer and more useful. A gate that rejects the dispatch with

```
Coverage 92% — parallel dispatch not justified. Switch to:
  sampling (find untreated files → single agent)
  or serial scan (1 agent reads all, reports untreated)
```

converts silent waste into a visible decision point. The user can override ("run anyway") but the override is explicit and auditable.

## External Context

`external_refs[]` empty at draft. Relevant `hub-research` topics:

- Parallel algorithm amortization literature — when does fork-join pay off at small N?
- Queueing theory cost models for server-side workload dispatch, adapted for agent-as-worker.
- LLM token cost vs developer tooling cost-benefit analysis.
- Whether any other agent frameworks (LangGraph, AutoGen, Crew) ship pre-flight gates for parallel dispatch.

Filling these in would let the paper ground its threshold claim in prior art rather than treating it as intuition.

## Proposed Builds

### `parallel-dispatch-coverage-gate` (POC)

A skill whose job is **the decision, not the work**. Inputs:

- `scope` — target corpus (glob or path)
- `marker` — grep pattern that identifies already-done files
- `threshold` — decision boundary (default 0.7)

Output: one of `dispatch-parallel | switch-to-sampling | switch-to-serial`, with numeric justification (`hit=X / total=Y = c`).

The skill is deliberately narrow. It does not dispatch, it does not annotate, it does not recover. It answers one question.

### `coverage-threshold-decision-table` (POC)

Knowledge entry in the `decision` category. A table of the form:

| Work type | Verify cost | Threshold |
|---|---|---|
| Java DTO annotation | High (compile) | 0.5 |
| Text content edits | Low (regex) | 0.8 |
| Schema migration | Very high (integration test) | 0.3 |
| ... | ... | ... |

Populated from real session data, augmented as new domains report their own numbers. A living document, version-bumped on every row addition.

### `parallel-bulk-annotation-preflight-section` (DEMO)

An edit to the existing `workflow/parallel-bulk-annotation` skill that adds a `Phase 0 — Pre-flight` section at the top:

```
Before any agent spawn, run:
  /hub-suggest "coverage-gate" — or follow the gate skill inline.

Threshold: see knowledge/decision/coverage-threshold-decision-table for
your work type. When coverage ≥ threshold, switch mode (sampling or serial)
and return; do not proceed to Phase 1.
```

This is the least-invasive way to make the gate discoverable — it lives where the how-to already lives.

## Open Questions

1. Is the threshold really ~0.7, or is it highly domain-specific? The paper asserts "roughly 70 percent" based on one pitfall observation. The decision table in the second proposed build exists partly to answer this question with more data.
2. Can the coverage probe be made automatic — a hook that runs on any `/hub-make --parallel` invocation? Or does it have to be opt-in via the gate skill? Automatic risks false positives; opt-in risks being forgotten.
3. Should the existing parallel skills be **retracted** and replaced with gate-mediated variants, or just annotated? The preflight-section proposal is annotation; retraction would force the decision. The former is pragmatic, the latter is honest.

## Limitations

- **n=1 evidence**: the 70% threshold claim rests on one observed session (the pitfall). Without additional data points across domains the number is illustrative, not authoritative.
- **No actual implementation**: this paper proposes but does not ship. The proposed builds are scoped as POC specifically so the paper is a call for work, not a claim of completed work.
- **Counter-argument not fully explored**: perhaps parallel dispatch is CHEAP ENOUGH in absolute terms that the break-even doesn't matter at typical token prices. The paper assumes tokens cost enough to make the gate worth building. That assumption may not hold in all deployment contexts (e.g., local models).

## Provenance

- Authored: 2026-04-24
- Status: pilot #2 for the `paper/` layer schema v0.1 — non-self-referential (subject outside this session's work, unlike paper #1)
- Schema doc: `paper-schema-draft.md`
- Sibling paper: `.paper-draft/workflow/technique-layer-composition-value/PAPER.md`
