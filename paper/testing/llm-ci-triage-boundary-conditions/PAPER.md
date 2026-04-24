---
version: 0.2.0-draft
name: llm-ci-triage-boundary-conditions
description: Where does LLM-based CI failure triage help vs silently hurt? Mapping the boundary conditions for adoption.
category: testing
tags:
  - llm
  - ci
  - triage
  - boundary-conditions
  - noise-vs-signal
  - hypothesis

type: hypothesis

premise:
  if: An LLM-based triage step (e.g. the Auto-Diagnose pattern implemented by `testing/llm-integration-test-failure-diagnosis`) is wired into a CI integration-test failure pipeline
  then: It reduces mean-time-to-diagnose for noise-heavy classes (flakes, environment drift, dependency churn) but introduces silent misclassification on novel logic bugs — making it net positive ONLY when the team's failure mix is roughly > 60 percent noise. Below that ratio, the silent-misclass cost (regressions hidden as "known flakes") exceeds the triage-time savings.

examines:
  - kind: skill
    ref: testing/llm-integration-test-failure-diagnosis
    role: the subject — the LLM-auto-diagnose pattern being analyzed
  - kind: skill
    ref: debug/investigate
    role: baseline — the human systematic 4-phase triage the LLM is proposed to replace or precede
  - kind: skill
    ref: debug/triage-issue
    role: downstream consumer — what happens to the LLM verdict (issue created, auto-closed, escalated)
  - kind: knowledge
    ref: decision/caveats-absence-confidence-cap
    role: counter-evidence — existing corpus stance on capping confidence when caveats are absent, directly relevant to LLM over-confidence failure mode

perspectives:
  - name: Noise-vs-Signal Boundary
    summary: LLM triage accuracy varies with failure novelty. On recurring patterns (flake signatures, known dependency conflicts), accuracy is high. On novel logic bugs that lack precedent in training data, the LLM either refuses (good) or confabulates a plausible-but-wrong diagnosis (bad). The boundary is domain-specific.
  - name: Escalation Path
    summary: What the CI pipeline does with the LLM verdict matters more than the verdict itself. Auto-closing "known flake" verdicts hides regressions; auto-escalating everything defeats the triage gain. The right middle position is the paper's proposed hybrid-routing build.
  - name: Cost Model
    summary: Token cost per triage × N failures must be compared against engineer-hours saved. Break-even is sensitive to both flake rate and engineer cost. Without measurement, adoption is faith-based.
  - name: Silent Failure Mode
    summary: The worst failure is not an obvious misclassification (which a reviewer catches) but a confident "known flake" label on what is actually a new regression. This is silent waste that accumulates across sessions — the same failure mode flagged in paper `workflow/parallel-dispatch-breakeven-point`.

external_refs: []

proposed_builds:
  - slug: llm-triage-confidence-dashboard
    summary: Dashboard tracking LLM triage confidence score vs actual outcome (retrospectively verified) over N weeks. Surfaces the per-class accuracy curve and the confidence-vs-correctness calibration drift.
    scope: poc
    requires:
      - kind: skill
        ref: testing/llm-integration-test-failure-diagnosis
        role: the LLM triager whose output the dashboard instruments
      - kind: knowledge
        ref: decision/caveats-absence-confidence-cap
        role: guides the confidence-cap visualization rules
  - slug: llm-triage-false-known-flake-pitfall
    summary: New pitfall knowledge entry documenting the "LLM confidently labeled as known flake but was actually a regression" failure mode, with reproduction heuristics and the escalation check that would have caught it.
    scope: poc
    requires:
      - kind: knowledge
        ref: decision/caveats-absence-confidence-cap
        role: seed — the closest existing entry to refine
      - kind: skill
        ref: testing/llm-integration-test-failure-diagnosis
        role: the source pattern the pitfall contextualizes
  - slug: hybrid-llm-human-triage-router
    summary: New skill that routes CI failures through LLM triage first, then escalates to human systematic investigation when LLM confidence is below a configurable threshold OR when the failure signature is novel (no seen-before match).
    scope: demo
    requires:
      - kind: skill
        ref: testing/llm-integration-test-failure-diagnosis
        role: the LLM step the router gates
      - kind: skill
        ref: debug/investigate
        role: the human-systematic fallback the router escalates to
      - kind: skill
        ref: debug/triage-issue
        role: the shared downstream both paths feed into

experiments:
  - name: mixed-failure-classification-replay
    hypothesis: LLM triage achieves ≥ 80 percent correct classification on the noise class (flakes, env, dependency) and ≤ 50 percent on novel logic bugs — the gap is the signal that motivates hybrid routing.
    method: |
      Select N = 20–50 historical CI failures with known post-mortem ground truth,
      evenly distributed across (flake, environment, dependency, novel-logic) classes.
      Replay each through the LLM triager with no context beyond the CI log. Record
      the LLM verdict + confidence score. Compute per-class accuracy and calibration
      (confidence vs correctness correlation).
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Where does LLM-based CI failure triage help vs silently hurt?

## Premise

**If** an LLM-based triage step (exemplified by the Auto-Diagnose pattern in [`testing/llm-integration-test-failure-diagnosis`](../../../skills/testing/llm-integration-test-failure-diagnosis/SKILL.md)) is wired into a CI integration-test failure pipeline, **then** it reduces mean-time-to-diagnose for noise-heavy classes (flakes, environment drift, dependency churn) but introduces silent misclassification on novel logic bugs — making it net positive ONLY when the team's failure mix is roughly > 60 percent noise. Below that ratio, the cost of regressions hidden as "known flakes" exceeds the triage-time savings.

This claim has two halves. The first half (noise reduction) is what vendors advertise. The second half (silent cost on novel bugs) is rarely measured because the failure mode is invisible by definition — a mislabeled regression is found only when production bites back.

## Background

The hub carries the baseline ingredients:

- `testing/llm-integration-test-failure-diagnosis` — wire an LLM diagnosis step into CI. Based on Google's Auto-Diagnose paper, claims 90 percent accuracy on a 71-case study, adopted across 52 k tests.
- `debug/investigate` — the human-systematic 4-phase alternative: investigate → analyze → hypothesize → implement, with an "iron law: no fixes without root cause."
- `debug/triage-issue` — downstream consumer: turns a triage verdict into a GitHub issue with TDD plan.

And one knowledge entry directly relevant:

- `decision/caveats-absence-confidence-cap` — a hub-wide position that LLM output confidence should be capped when caveats are absent. Central to this paper's silent-failure argument.

This paper does NOT claim the LLM approach is wrong. It claims the effectiveness is **conditional on failure-mix composition**, and the conditioning is unmeasured in most adoption stories.

## Perspectives

### 1. Noise-vs-Signal Boundary

Classification accuracy for an LLM-based triager is not a single number. It factors across failure classes:

- **Flakes** (timing, retry-able): very high recognition rate — the LLM sees ten thousand similar logs in training.
- **Environment drift** (dependency version skew, missing env var): high.
- **Dependency churn** (new major version breaks API): moderate — depends on how recent.
- **Novel logic bugs** (off-by-one, rare race, domain-specific invariant violation): **low and rarely admitted as low by the LLM itself**.

The last class is the killer. The LLM produces a plausible diagnosis even when its actual confidence should be near zero. Auto-Diagnose's 90 percent headline is a weighted average that obscures the per-class breakdown.

### 2. Escalation Path

What happens to an LLM verdict determines whether the triage step is a gain or a loss:

- **Auto-close as "known flake"**: regression-hiding risk. Silent failure mode.
- **Always file a ticket**: the triage step saves no human time — it just moves the label upstream.
- **Hybrid routing**: LLM-confident verdicts auto-close or auto-escalate; low-confidence verdicts go to human systematic investigation. This is what the paper's third proposed build prototypes.

No adoption path is neutral. The decision happens implicitly if not explicitly.

### 3. Cost Model

Back-of-envelope:

```
llm_cost_per_triage   ≈ N_tokens × token_price
engineer_cost_saved   ≈ (mean_human_triage_time − residual_human_triage_time) × eng_rate
                      × fraction_correctly_triaged_by_llm
```

Break-even depends on:
- Flake rate (the LLM's best class) as fraction of total failures
- Engineer hourly rate
- LLM token cost per triage (~100 k tokens for a noisy log is common)
- Per-failure time savings

At 80 percent flake rate and typical current token pricing, LLM triage is clearly net positive. At 30 percent flake rate with high novel-bug rate, the silent-misclass risk can flip the sign. The 60 percent threshold in the premise is the paper's rough estimate; the experiment tightens it.

### 4. Silent Failure Mode

The worst failure is not an obvious misclassification (which a reviewer catches) but a confident "known flake" label on what is actually a new regression. This is the same failure shape flagged in paper [`workflow/parallel-dispatch-breakeven-point`](../../workflow/parallel-dispatch-breakeven-point/PAPER.md) — loud failures teach the team; silent failures accumulate.

A team that adopts LLM triage without a confidence calibration dashboard cannot distinguish a 92 percent-accurate triager from a 75 percent-accurate-but-overconfident triager. Both produce the same log volume. The second one ships regressions.

## External Context

`external_refs[]` is empty. The paper would be strengthened by pulling in:

- Google's Auto-Diagnose paper (the system `testing/llm-integration-test-failure-diagnosis` is based on) and its 71-case study methodology
- LLM calibration literature (Tetlock-style forecasting, Brier score) applied to code-triage outputs
- Prior art on ROC/precision-recall measurement in test classification
- Any other framework (LangGraph, Humanloop, etc.) that ships CI-triage with calibration as a first-class feature vs bolted on

`/hub-research` would populate this list.

## Proposed Builds

### `llm-triage-confidence-dashboard` (POC)

A dashboard showing LLM triage confidence vs retrospectively verified outcome over N weeks. Surfaces:

- Per-class accuracy (flake / env / dep / novel) as time series
- Calibration curve: did 90 percent-confident verdicts actually hit 90 percent accuracy?
- Regression-hit rate attributable to mislabeled "known flake" verdicts

Without this, adoption is faith-based. With it, the break-even from the premise can be measured.

### `llm-triage-false-known-flake-pitfall` (POC)

A new pitfall knowledge entry documenting the specific silent-failure shape, with reproduction heuristics and the escalation check that would have caught it. Seed from `decision/caveats-absence-confidence-cap`. This entry is the paper's minimal corpus contribution if nothing else ships.

### `hybrid-llm-human-triage-router` (DEMO)

A new skill that routes CI failures through LLM triage first, then escalates to human systematic investigation (`debug/investigate`) when LLM confidence is below a threshold OR when the failure signature is novel (no seen-before match in a running fingerprint log). Completes the loop that the confidence dashboard measures.

## Open Questions

1. Is the 60 percent noise-mix threshold stable across organizations, or is it a moving target driven by the LLM's training data recency? The experiment addresses the former; only longitudinal observation can answer the latter.
2. Can the LLM reliably self-flag low-confidence verdicts? If yes, the hybrid router is trivial. If no, the router needs an external signal (e.g. embedding similarity to previously seen failures).
3. Is "silent misclassification" genuinely worse than "slow human triage" in terms of production impact, or is it just a different distribution of cost? The answer depends on how regressions manifest in the specific system.

## Limitations

- **No measurement yet.** The 60 percent threshold is an estimate. The experiment is planned but not run.
- **LLM capability is a moving target.** A 2025-era LLM's per-class accuracy will likely improve. The paper's conclusions may have a 12–18 month shelf life before needing a refresh.
- **Assumes retrospective ground truth.** The experiment requires known post-mortem verdicts for historical CI failures. Teams without rigorous post-mortems cannot reproduce the measurement directly.
- **Single pattern examined.** The paper generalizes from one specific auto-diagnose skill. Other LLM-triage approaches (chain-of-thought, multi-agent debate, retrieval-augmented) may have different accuracy profiles.

## Provenance

- Authored: 2026-04-24
- Status: pilot #3 for the `paper/` layer schema v0.2 — non-self-referential (subject: LLM triage adoption, not this session's own output)
- Schema doc: `docs/rfc/paper-schema-draft.md`
- Sibling papers:
  - `paper/workflow/technique-layer-composition-value` (meta, self-referential)
  - `paper/workflow/parallel-dispatch-breakeven-point` (implemented, produced a knowledge outcome)
