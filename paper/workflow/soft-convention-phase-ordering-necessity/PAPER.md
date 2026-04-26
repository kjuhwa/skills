---
version: 0.2.0-draft
name: soft-convention-phase-ordering-necessity
description: "Is the 4-phase ordering (schema → audit → dogfood → enforce) necessary, or do other orderings work too?"
category: workflow
tags:
  - phase-ordering
  - necessity-claim
  - cascade
  - hypothesis
  - counter-example

type: hypothesis

premise:
  if: A team rolls out a soft convention with phase orderings other than schema → audit → dogfood → enforcement
  then: Failure modes appear per ordering — audit+enforce bundled = baseline blindness; dogfood-first = unmeasurable; enforce-first = cross-cutting breakage. Canonical ordering necessary, not arbitrary.

examines:
  - kind: technique
    ref: workflow/soft-convention-4pr-cascade
    role: subject
    note: subject technique whose strict-ordering claim is interrogated
  - kind: knowledge
    ref: workflow/pre-push-discipline-test-lint-typecheck
    role: lint-gate-baseline
    note: canonical lint-gate ordering that the cascade's enforcement phase inherits
  - kind: knowledge
    ref: arch/additive-registry-schema-versioning
    role: schema-first-principle
    note: schema-first principle the cascade's phase 1 enforces
  - kind: knowledge
    ref: pitfall/yaml-mid-string-colon-strict-parser-mismatch
    role: audit-necessity-evidence
    note: case where audit caught what local parser missed; validates audit phase
  - kind: paper
    ref: arch/cost-displacement-shape-cross-paper-survey
    role: orthogonal-prior
    note: survey flagged authoring bias; this paper picks non-cost-displacement shape

perspectives:
  - name: Audit Bundled with Enforcement
    summary: Without separate audit phase, no baseline measurement exists. Self-corrective threshold has no signal to compare against. Convention either ships forced or stalls without diagnosis.
  - name: Dogfood Before Audit
    summary: Without baseline, dogfood targets are unknown. Author guesses which entries need backfill; misses the latent offenders an audit would surface. Adoption metric is meaningless without prior measurement.
  - name: Enforcement Before Dogfood
    summary: Cross-cutting breakage on existing entries. Unrelated PRs touching non-compliant entries get blocked. Forces emergency dogfood under deadline pressure. Canonical failure the cascade prevents.
  - name: Counter-Argument — Trivial Conventions
    summary: For 1-rule conventions affecting <5 entries, phases can collapse to a single PR. Strict ordering is overkill at small N. The technique's value depends on N reaching a complexity threshold.

external_refs: []

proposed_builds:
  - slug: ordering-permutation-benchmark
    summary: Replay N historical conventions under each of the 6 phase orderings (4 phases = 24 permutations; 6 are realistic). Measure failure mode incidence per ordering. Synthetic + real corpus data.
    scope: poc
    requires:
      - kind: technique
        ref: workflow/soft-convention-4pr-cascade
        role: subject
        note: technique whose ordering necessity is benchmarked
      - kind: knowledge
        ref: pitfall/yaml-mid-string-colon-strict-parser-mismatch
        role: failure-mode-evidence
        note: canonical case the benchmark validates against
  - slug: failure-mode-decision-table
    summary: Knowledge entry mapping (ordering × convention shape) → expected failure mode. Backed by benchmark data. Names which orderings work for which convention shapes.
    scope: poc
    requires:
      - kind: knowledge
        ref: workflow/pre-push-discipline-test-lint-typecheck
        role: lint-gate-anchor
        note: canonical ordering the table compares alternatives against
  - slug: minimal-cascade-detector
    summary: Heuristic that classifies a convention as "needs full 4-PR cascade" vs "phases can collapse" based on convention shape (rule count, affected entries, breaking-change risk).
    scope: poc
    requires:
      - kind: knowledge
        ref: arch/additive-registry-schema-versioning
        role: schema-shape-input
        note: schema shape is the primary input the detector classifies on

experiments:
  - name: phase-ordering-necessity-measurement
    hypothesis: Across 3+ historical conventions × 6 phase-orderings, canonical produces zero failure-mode incidents; each alternative produces ≥1 deterministic failure matching perspective predictions.
    method: |-
      Replay 3 historical convention rollouts (paper v0.3, §16, technique
      v0.2) under 6 phase-orderings each (canonical + 5 permutations).
      Score each cell by failure-mode incidence. See body §Methods.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Soft-Convention Phase-Ordering Necessity

## Introduction

The `workflow/soft-convention-4pr-cascade` technique recommends a strict phase ordering — schema → audit → dogfood → enforcement — and lists 3 failure modes that other orderings produce. The claim is that the canonical ordering is **necessary**, not arbitrary.

This paper interrogates that necessity claim. The premise predicts deterministic failure modes per alternative ordering; the experiment replays historical convention rollouts under permuted orderings to see whether the failures actually surface or whether the ordering claim is aspirational.

### Background

The subject technique was authored in #1159 from this session's repeated cascade pattern (paper v0.3 amendment, §16 brevity, technique v0.2 amendment). All three cascades followed the canonical ordering. **Whether that ordering was necessary or merely habitual** is unknowable from the 3 confirming examples alone — the technique's necessity claim needs counter-example testing.

The orthogonal-prior is `paper/arch/cost-displacement-shape-cross-paper-survey` (the survey that synthesized 4 hypothesis papers' shared cost-displacement shape). The survey explicitly flagged **selection bias** as a risk: same author, same session, same shape repeated. This paper is **deliberately a non-cost-displacement hypothesis** — a necessity claim about phase ordering, not a saturation/crossover claim about cost. Including the survey as orthogonal-prior is the loop closure: this paper tests whether the author CAN write a different shape when trying, which informs the bias hypothesis.

### What this paper sets out to test

Whether the canonical 4-phase ordering produces materially better outcomes than alternative orderings, or whether the technique's strict-ordering claim is over-specified habit.

## Methods

(planned — see `experiments[0].method` for the measurement skeleton)

The experimental harness replays 3 historical convention rollouts (paper v0.3 amendment, §16 brevity convention, technique v0.2 amendment — all from this session) under 6 phase orderings:

1. **Canonical**: schema → audit → dogfood → enforcement
2. **Audit-bundled**: schema → (audit + enforcement combined) → dogfood
3. **Dogfood-first**: schema → dogfood → audit → enforcement
4. **Enforcement-early**: schema → enforcement → audit → dogfood
5. **Schema-late**: audit → dogfood → schema → enforcement (audit a not-yet-spec'd convention)
6. **Single-PR**: all 4 phases bundled into one PR

The remaining 18 permutations of 4 phases are excluded as obviously broken (e.g., enforcement before schema). The 6 selected are realistic alternatives.

For each (convention × ordering) cell, the harness scores:

- **Cross-cutting breakage**: did existing-but-non-compliant entries get blocked?
- **Baseline blindness**: was the dogfood scope known before dogfood started?
- **Adoption uncertainty**: could the self-corrective gate fire with measurable signal?
- **Total PR count**: more or fewer than canonical's 4?
- **Author elapsed time**: per-cell, including any failure-mode recovery

Total cells: 3 conventions × 6 orderings = **18 cells**. Replay can be partly synthetic (reconstructing the cascade from git log) and partly real (running fresh PRs with intentional mis-ordering on a sandbox repo).

### Failure mode taxonomy

Each ordering predicts specific failures:

| Ordering | Predicted failure |
|---|---|
| Canonical | (none) |
| Audit-bundled | Baseline blindness — adoption metric has no prior reading |
| Dogfood-first | Adoption uncertainty — dogfood targets are guesses, not measurements |
| Enforcement-early | Cross-cutting breakage — non-compliant entries fail unrelated PRs |
| Schema-late | Audit/dogfood operate on undefined spec, producing inconsistent results |
| Single-PR | All four failure modes collapse together; impossible to bisect when broken |

If the experiment produces these failures cell-by-cell, the necessity claim is supported. If most alternative orderings work fine in practice, the claim is over-specified.

## Results

(pending — experiment status is `planned`; this paper is in draft state. Will be populated when the benchmark runs and `/hub-paper-experiment-run` closes the loop.)

## Discussion

(pending)

The expected finding shape: the canonical ordering produces zero failures across all 3 conventions; each alternative ordering produces at least one of the 4 failure modes deterministically; the single-PR ordering produces all 4 simultaneously. If supported, the necessity claim is empirically grounded.

If refuted (alternative orderings work fine in practice), the technique is over-engineered. The cascade's value would reduce to "habit that prevents bad outcomes the author imagined would happen but never did." That is also informative — it tests whether technique authors are over-specifying based on their own anxiety vs measured failure patterns.

### Connection to the survey paper's bias hypothesis

The survey paper (`paper/arch/cost-displacement-shape-cross-paper-survey`) explicitly flagged single-author selection bias as a risk: "the author looks for cost-displacement everywhere because paper #1 was the first closed-loop." This paper deliberately picks a **non-cost-displacement** hypothesis (necessity, not saturation) to test whether the author can write a different shape when trying.

If this paper's experiment produces a clean necessity-shape result (canonical ordering works, alternatives fail), the bias hypothesis is partially weakened — the author CAN diversify shapes deliberately. If this paper's results unexpectedly converge on a saturation/crossover shape after all (e.g., "all orderings fail past N=10 conventions"), the bias hypothesis gains support — even when trying to write a different shape, the author falls back to the familiar pattern.

Either outcome refines the survey's claim.

### Limitations

- 3 historical conventions is a small N. Statistical power is low even if all 18 cells produce expected failures.
- All 3 conventions came from the same author (me). Multi-author replication is needed to test whether the canonical ordering is *universally* necessary or *author-specific*.
- The "replay under different ordering" is partly synthetic. A truly clean experiment would require fresh convention rollouts with intentionally permuted orderings — slow and risky.
- The 6 selected orderings are subjective. Other plausible alternatives (e.g., audit + dogfood combined as a single PR) aren't tested.
- Failure modes are defined qualitatively (cross-cutting breakage, baseline blindness, etc.). Operationalizing them as binary measurements introduces interpretation risk.

### Future work

1. Run the synthetic replay first to establish baseline failure-mode incidence per ordering. Decide whether to invest in real-PR experiments based on synthetic findings.
2. Recruit a second author to attempt a convention rollout with the canonical ordering. Compare their experience to the technique's recipe.
3. Test the minimal-cascade-detector heuristic against the 3 historical conventions. Did any of them have a shape where phases could have collapsed without harm?
4. Tie back to the survey paper. If this paper's experiment produces a non-cost-displacement shape, update the survey's `## Discussion` with the diversification evidence. If it converges on cost-displacement after all, that's a stronger bias signal.

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/soft-convention-4pr-cascade`**
subject technique whose strict-ordering claim is interrogated

**knowledge — `workflow/pre-push-discipline-test-lint-typecheck`**
canonical lint-gate ordering that the cascade's enforcement phase inherits

**knowledge — `arch/additive-registry-schema-versioning`**
schema-first principle the cascade's phase 1 enforces

**knowledge — `pitfall/yaml-mid-string-colon-strict-parser-mismatch`**
canonical case where audit caught what local parser missed; validates audit phase

**paper — `arch/cost-displacement-shape-cross-paper-survey`**
survey that explicitly flagged authoring bias; this paper deliberately picks a non-cost-displacement shape to test the bias hypothesis


## Build dependencies (proposed_builds)

### `ordering-permutation-benchmark`  _(scope: poc)_

**technique — `workflow/soft-convention-4pr-cascade`**
technique whose ordering necessity is benchmarked

**knowledge — `pitfall/yaml-mid-string-colon-strict-parser-mismatch`**
canonical case the benchmark validates against

### `failure-mode-decision-table`  _(scope: poc)_

**knowledge — `workflow/pre-push-discipline-test-lint-typecheck`**
canonical ordering the table compares alternatives against

### `minimal-cascade-detector`  _(scope: poc)_

**knowledge — `arch/additive-registry-schema-versioning`**
schema shape is the primary input the detector classifies on

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Subject: `paper/from-technique` flow against `technique/workflow/soft-convention-4pr-cascade` (greenfield v0.2 technique authored 2026-04-26 in #1159)
- Status: draft — `experiments[0]` is planned; the paper will move to `status=implemented` once the replay benchmark runs
- **Deliberate non-cost-displacement shape**: this paper's premise is a necessity claim, not a saturation/crossover claim. Authored after `paper/arch/cost-displacement-shape-cross-paper-survey` flagged single-author selection bias on the cost-displacement shape across the corpus's 4 prior hypothesis papers. The author tests whether they CAN write a different shape deliberately.
