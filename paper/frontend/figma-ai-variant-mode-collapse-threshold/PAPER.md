---
version: 0.2.0-draft
name: figma-ai-variant-mode-collapse-threshold
description: "At what N does AI-explored React variants suffer mode collapse, exceeding usefully-distinguishable count?"
category: frontend
tags:
  - figma
  - react
  - ai-variant
  - mode-collapse
  - hypothesis
  - design-exploration

type: hypothesis

premise:
  if: design-an-interface dispatches N parallel sub-agents to explore React variants under the figma-driven-ai-react-design-system pipeline
  then: Distinguishable variant count saturates at N≈4-5; past N≈8 mode collapse produces near-identical outputs. Reviewer fatigue exceeds value of more variants; token vocabulary accelerates collapse.

examines:
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    role: subject
    note: subject technique whose AI-variant-count claim is interrogated
  - kind: skill
    ref: misc/design-an-interface
    role: atom-under-test
    note: parallel sub-agent variant generator evaluated for mode collapse
  - kind: skill
    ref: design/figma-token-to-tailwind-theme
    role: vocabulary-constraint
    note: token vocabulary that bounds the design space sub-agents explore
  - kind: knowledge
    ref: decision/semantic-design-tokens-only
    role: style-constraint
    note: lint constraint that forces variants to converge on a token subset
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: prior-paper
    note: prior paper on parallel-dispatch breakeven; same shape on a creativity axis

perspectives:
  - name: Variant Distinguishability Saturation
    summary: Each sub-agent samples a finite token vocabulary. Once N exceeds the distinct-design-decision count, additional sub-agents produce variants near existing ones. Distinguishability saturates.
  - name: Token Vocabulary Constraint
    summary: semantic-tokens-only lint forces variants to share the same colour and spacing tokens. Constraint accelerates convergence — variants can only differ in layout and density once tokens are fixed.
  - name: Reviewer Capacity
    summary: Humans compare 3-5 variants meaningfully; past 8, decision fatigue dominates. Even if the technical mode-collapse threshold were higher, the human-review threshold caps useful N at ~5-7.
  - name: Counter-Argument — Prompt Diversity
    summary: Mode collapse is a prompt-diversity artifact. With explicit divergence prompts (varied layouts, density, interaction surfaces), N≈12 may still produce distinguishable variants.

external_refs: []

proposed_builds:
  - slug: variant-distinguishability-benchmark
    summary: Measure pairwise variant similarity at N∈{2, 4, 6, 8, 12, 20}. Use embedding-distance proxy + human pairwise-different judgment. Plot saturation curve.
    scope: poc
    requires:
      - kind: skill
        ref: misc/design-an-interface
        role: variant-generator
        note: the sub-agent generator under measurement
      - kind: technique
        ref: frontend/figma-driven-ai-react-design-system
        role: subject
        note: the surrounding technique that bounds the design space
  - slug: prompt-diversity-amplifier
    summary: Preprocesses each sub-agent prompt to maximize divergence — different layouts, density profiles, interaction surfaces. Tests whether mode collapse is a prompt artifact.
    scope: poc
    requires:
      - kind: skill
        ref: misc/design-an-interface
        role: variant-generator
        note: the sub-agent generator that consumes the amplified prompts
  - slug: variant-count-decision-table
    summary: Knowledge entry mapping (component-complexity × token-vocabulary-size × N) → recommended variant count. Backed by benchmark data from build [1].
    scope: poc
    requires:
      - kind: knowledge
        ref: decision/semantic-design-tokens-only
        role: style-constraint
        note: token constraint that the table accounts for as a saturation accelerator

experiments:
  - name: variant-mode-collapse-measurement
    hypothesis: At N=4 variants, pairwise embedding distance averages ≥0.5; at N=12, average drops below 0.2 (mode-collapse signal). Reviewer pick consistency drops below 50% past N=8.
    method: |-
      Spawn N∈{2,4,6,8,12,20} sub-agents per component. Score pairwise
      distinguishability via embedding distance + human pairwise-different
      judgment. 5 components per N. See body §Methods.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Figma AI Variant Mode-Collapse Threshold

## Introduction

The `frontend/figma-driven-ai-react-design-system` technique recommends `misc/design-an-interface` (parallel sub-agent variant generation) as its phase 2 — exploration — to produce 3-5 radically different React component variants on top of Figma tokens. The technique does not specify how many sub-agents to dispatch or what limits the useful return.

This paper interrogates the variant-count claim. The premise predicts a saturation threshold past which mode collapse dominates, exhausting the variant exploration's value before reviewer fatigue takes over.

### Background

The subject technique (`figma-driven-ai-react-design-system`) ships with `recipe.preconditions` listing "AI agent capacity to spawn parallel sub-agents for variant exploration" but no quantitative variant count. Its phase 2 description says "AI sub-agents generate N radically different React variants on top of the tokens from [0]"; the "radically different" qualifier is aspirational, not enforced.

The prior paper `workflow/parallel-dispatch-breakeven-point` established that coordination cost can dominate parallelism gain past a threshold. This paper applies the same lens to a different cost — variant noise rather than coordination overhead. Same shape; different domain.

### What this paper sets out to test

Whether N parallel sub-agents produce N distinguishable variants up to some saturation point, where the ceiling lies, and which factor (token vocabulary size, prompt diversity, reviewer capacity) drives the ceiling location.

## Methods

(planned — see `experiments[0].method` for the measurement skeleton)

The experimental harness dispatches N sub-agents per test component to generate variants on top of a fixed Figma token set, then scores pairwise distinguishability across two axes:

- **Objective** — pairwise embedding distance (CLIP-style) computed on rendered PNG output
- **Subjective** — human reviewer pairwise-different judgment (binary)

Variant counts step from N=2 to N=20: `{2, 4, 6, 8, 12, 20}`. Five test components per N level (button, card, modal, list-item, navigation). Tokens fixed across all runs. Each sub-agent receives the same base prompt unless the prompt-diversity-amplifier variant of the experiment is enabled.

Total cells: 5 components × 6 N values × 2 prompt-modes = **60 cells**, deterministic seed.

### Distinguishability metric

Pairwise embedding distance for each (variant_i, variant_j) pair within a single (component × N) cell. Aggregate to: `avg_distance(component, N) = mean over all pairs`. The hypothesis predicts this curve saturates around N=4-5 and drops past N=8.

### Reviewer pick consistency

Five reviewers blindly rank variants per (component × N) cell. Consistency is the proportion of pairwise rankings that all five agree on. The hypothesis predicts consistency drops below 50% past N=8 — past that point, reviewers are picking near-randomly between near-identical variants.

## Results

(pending — experiment status is `planned`; this paper is in draft state. Will be populated when the benchmark runs and `/hub-paper-experiment-run` closes the loop.)

## Discussion

(pending)

The expected finding shape: distinguishability saturates around N=4-5; past N=8, both the embedding-distance metric and reviewer-consistency metric drop sharply. The exact saturation point depends on token vocabulary size and component complexity.

If supported, the paper's outcome would produce:
- a `knowledge/decision/figma-ai-variant-count-cap` entry with the measured saturation band
- a body update to `figma-driven-ai-react-design-system` replacing the unspecified N with a guidance like "spawn N=4-5 sub-agents per component; past N=8 returns diminish"
- a generalized `skill/ai/parallel-variant-saturation-detector` that runs the embedding-distance check live during exploration and short-circuits when saturation is detected

If refuted (variants stay distinguishable through N=20, or saturate earlier than N=4), the paper still produces actionable knowledge — the technique's exploration phase needs different bounds.

### Limitations

- 5 components per N level is a coarse sample. Real production component libraries are larger and more diverse.
- "Distinguishability" via embedding distance is a proxy for "useful design difference"; a metric that better captures design intent (e.g., interaction-surface diversity, layout taxonomy classification) might shift the saturation point.
- Token vocabulary is held fixed across runs. A larger or smaller vocabulary may shift the threshold; the prompt-diversity-amplifier variant tests one direction but not the vocabulary-size axis.
- Reviewer judgments are subjective and depend on reviewer expertise. Five reviewers per cell is small; production deployment would use more.
- The technique's gap-guard phase 4 (review-checklist) interacts with variant count — more variants produce more AI-filled gaps to review. This experiment doesn't measure that interaction.

### Future work

1. Run the benchmark with varying token-vocabulary sizes (small / medium / large). Does the saturation point shift linearly with vocabulary or non-linearly?
2. Extend the prompt-diversity-amplifier variant to cover {layout / density / interaction-surface} as orthogonal axes. Does explicit prompt diversity push the saturation past N=12?
3. Tie back to `workflow/parallel-dispatch-breakeven-point` and `paper/backend/change-stream-lock-contention-scaling-curve` (#1151) and `paper/workflow/swagger-spec-hardening-size-crossover` (#1155). All four interrogate parallel/scale-out cost-displacement on different axes — if all converge on the same saturation shape, the corpus has triangulated a layer-invariant claim.
4. Measure the per-variant token cost. Mode collapse may be cheap (similar variants share most of the LLM's reasoning) or expensive (each variant pays full cost regardless of similarity). The technique's cost model doesn't distinguish; this experiment could.

<!-- references-section:begin -->
## References (examines)

**technique — `frontend/figma-driven-ai-react-design-system`**
subject technique whose AI-variant-count claim is interrogated

**skill — `misc/design-an-interface`**
parallel sub-agent variant generator evaluated for mode collapse

**skill — `design/figma-token-to-tailwind-theme`**
token vocabulary that bounds the design space sub-agents explore

**knowledge — `decision/semantic-design-tokens-only`**
lint constraint that forces variants to converge on a token subset

**paper — `workflow/parallel-dispatch-breakeven-point`**
prior paper on parallel-dispatch breakeven; same shape on a creativity axis


## Build dependencies (proposed_builds)

### `variant-distinguishability-benchmark`  _(scope: poc)_

**skill — `misc/design-an-interface`**
the sub-agent generator under measurement

**technique — `frontend/figma-driven-ai-react-design-system`**
the surrounding technique that bounds the design space

### `prompt-diversity-amplifier`  _(scope: poc)_

**skill — `misc/design-an-interface`**
the sub-agent generator that consumes the amplified prompts

### `variant-count-decision-table`  _(scope: poc)_

**knowledge — `decision/semantic-design-tokens-only`**
token constraint that the table accounts for as a saturation accelerator

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Subject: `paper/from-technique` flow against `technique/frontend/figma-driven-ai-react-design-system` (greenfield v0.2 technique authored 2026-04-26 in #1150)
- Status: draft — `experiments[0]` is planned; the paper will move to `status=implemented` once the benchmark runs and `/hub-paper-experiment-run` closes the loop
- Fourth paper interrogating a closed-loop subject after `parallel-dispatch-breakeven-point` (corpus's first), `change-stream-lock-contention-scaling-curve` (#1151), and `swagger-spec-hardening-size-crossover` (#1155). Same coordination/saturation cost-displacement shape applied to a creativity-exploration axis.
