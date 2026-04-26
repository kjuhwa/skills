---
version: 0.3.0-draft
name: figma-claude-react-iteration-convergence
description: "Tests whether Claude's Figma→React iteration converges by N=3–5 — first convergence-shape paper in the corpus."
type: hypothesis
status: draft
category: frontend
tags:
  - figma
  - claude
  - react
  - css
  - convergence
  - non-cost-displacement

premise:
  if: "Claude is given a Figma reference + design tokens, generates a React component + CSS, then iterates with visual-diff feedback (pixel diff + token violation count) for N rounds"
  then: "both metrics converge by N=3–5 with variance shrinking under threshold; iterations past N=5 produce only marginal improvement (diminishing returns plateau)"

examines:
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "the technique whose iteration loop this paper measures"
  - kind: paper
    ref: frontend/figma-ai-variant-mode-collapse-threshold
    note: "sibling figma+ai paper exploring variant collapse"

perspectives:
  - by: technique-author
    view: "the technique describes the pipeline (Figma → tokens → Claude → React) but does not bound iteration count. The paper closes that gap with a convergence claim that operators can plan against."
  - by: skeptic
    view: "convergence depends on diff feedback's signal-to-noise. If pixel diff includes anti-aliasing, Claude chases noise. Token-violation alone may converge faster but misses visual fidelity."
  - by: corpus-curator
    view: "first convergence-shape paper in the corpus (was 0/22). Closes a layer-gap surfaced by paper #1188 census. Worked example #7 of #1188 verdict rule (non-cost-displacement framing)."

experiments:
  - name: iteration-vs-diff-convergence
    status: planned
    method: "Drive Claude through 10 rounds × 5 Figma components (button/card/modal/nav/form). Per round: render headless, compute pixel diff + token violations, feed back. Full protocol in body Methods."
    measured: "pixel diff per N; token violation count per N; iteration at which both drop within 5% of final value (= convergence point)"
    result: null
    supports_premise: null
    refutes: "implicit assumption that more iterations always improve fidelity"
    confirms: null

requires:
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "the technique under test"
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "survey that surfaced the convergence-shape paper-layer gap (0/22) and motivated this paper's framing"
---

# Figma → Claude → React Iteration Convergence

> Tests whether Claude's iteration loop on Figma → React components converges by N=3–5 rounds, with diminishing returns thereafter. **First convergence-shape paper in the corpus** — closes the 0/22 paper-layer gap surfaced by paper #1188's cross-layer census. Worked example #7 of paper #1188's verdict rule (non-cost-displacement framing).

## Introduction

The technique `frontend/figma-driven-ai-react-design-system` describes a pipeline: Figma tokens → Tailwind v4 theme → Claude generates React variants in parallel → Code Connect binding. What it does NOT specify: **how many iteration rounds before fidelity stops improving.**

Operators using this technique today guess. Some stop after one round (Claude's first attempt). Some loop indefinitely chasing pixel-perfect matching. The right answer is somewhere between, and probably class-conditional (button vs nav vs form). This paper measures that.

### Why convergence (NOT cost-displacement, threshold-cliff, log-search)

The cost-displacement framing for this question would have looked like:

> "as iterations grow, generation cost grows but fidelity cost shrinks; crossover at optimal iteration count"

That framing is **wrong about the shape**. The actual shape is:

- **N=1**: Claude's first guess, large diff
- **N=2–3**: substantial diff reduction per round (high feedback signal-to-noise)
- **N=4–5**: smaller per-round reduction, approaching fixed point
- **N>5**: marginal improvement, may chase noise (anti-aliasing, sub-pixel artifacts)

This is a **convergence shape**: bounded monotonic-decreasing sequence approaching a fixed point with diminishing returns. NOT a smooth crossover (cost-displacement). NOT a discontinuous cliff (threshold-cliff). NOT log-search (no halving). NOT hysteresis (no oscillation).

Per paper #1188's verdict rule, this paper deliberately frames around the technique's actual shape — convergence — rather than retrofit cost-displacement.

### Why this matters in practice

For a team using Claude to generate React components from Figma references, the iteration count drives both wall-clock cost and operator patience. If convergence happens at N=3, then a 10-iteration loop wastes 7 rounds of generation. If convergence happens at N=8, then a 3-iteration cap leaves quality on the table. The paper measures where the inflection sits for representative components.

## Methods

For each of 5 Figma reference components:
- **button** — single primary action, tokens for color/radius/typography
- **card** — container with image + text, multiple slots
- **modal** — overlay + dismiss + scroll, focus trap concerns
- **nav** — multi-link, hover/active states
- **form** — input + label + validation, multiple field types

Drive Claude through 10 iteration rounds per component:

1. **Round 1**: Claude receives Figma reference + design tokens → generates React + CSS
2. **Render**: headless browser snapshot at fixed viewport
3. **Diff**: compute pixel diff vs Figma export + count token violations (any color/spacing/font value not from the token set)
4. **Round N+1**: Claude receives previous output + diff annotations → next attempt
5. Repeat through round 10

Per round, record:
- Pixel diff (sum of squared per-pixel RGB delta, normalized)
- Token violation count
- Convergence check: round at which subsequent rounds change diff by less than 5%

Compute convergence round per component. Hypothesis confirmed if median convergence round is in [3, 5] across all 5 components.

### What this paper is NOT measuring

- **Multi-Claude voting** — single Claude per round. Multi-agent voting is a different technique (`technique/ai/multi-agent-fan-out-with-isolation`).
- **Cost displacement** — there is no "as N grows, cost X grows but cost Y shrinks with crossover" claim. Convergence describes a sequence approaching a fixed point.
- **Pixel-perfect match** — convergence may settle at a non-zero diff (irreducible noise floor). The paper measures convergence, not zero-diff achievement.
- **Designer-Claude disagreement** — when Figma reference is ambiguous (e.g. unclear hover state), Claude may converge to the wrong fixed point. Out of scope; assumes reference is unambiguous.

## Results

`status: planned` — no data yet. Result will populate when at least one component has been measured through 10 rounds.

Expected output table (template):

| Component | N=1 diff | N=3 diff | N=5 diff | N=10 diff | Convergence round |
|---|---:|---:|---:|---:|---:|
| button | TBD | TBD | TBD | TBD | TBD |
| card | TBD | TBD | TBD | TBD | TBD |
| modal | TBD | TBD | TBD | TBD | TBD |
| nav | TBD | TBD | TBD | TBD | TBD |
| form | TBD | TBD | TBD | TBD | TBD |

## Discussion

### Why this paper exists in the convergence column

Paper #1188 found 8/22 papers (36%) frame as cost-displacement, while only 2/25 techniques (8%) do. **Convergence appears in 1/25 techniques and 0/22 papers** — a complete layer-gap. This paper is the first to introduce convergence as a paper-shape category, joining log-search (#1194), hysteresis (#1195), and threshold-cliff (#1196/#1197/#1198) as deliberate non-cost-displacement worked examples.

If the hypothesis lands (median convergence at N=3–5), the corpus gains:

- First convergence-shape paper, opening the category
- A practical iteration-cap rule for Figma+Claude+React workflows
- Continued evidence the bias-correction methodology of #1188 generalizes — fifth distinct shape category now has at least one paper

### What would refute the hypothesis

- Median convergence at N>7 across components → iterations don't pay off as fast as predicted; technique should warn operators to budget more rounds, or invest in better diff signal
- Median convergence at N<2 → Claude converges almost instantly; iterating is wasted overhead, technique should cap at 1 round
- One component (likely form, due to multi-state complexity) has wildly different convergence than others → convergence is component-class-conditional, single rule of thumb misleading
- Pixel diff diverges past N=5 (chasing anti-aliasing noise) → convergence shape was wrong assumption; iteration introduces drift, not convergence

### What partial-support would look like

- Median converges in [3, 5] for 4 of 5 components, but form needs [6, 8] → form is out-of-band; technique notes form as exception
- Both metrics converge but at different N (pixel diff at N=3, token violation at N=6) → the paper's "convergence by N=5" overstates; should specify per-metric

### Component-class hypothesis (sub-claim)

Different component classes likely converge at different rates:
- **Simple semantic** (button, nav link) → converges fast (N=2–3); few states, clear visual contract
- **Compound layout** (card, modal) → converges medium (N=3–5); more layout decisions, slot positioning
- **Multi-state** (form, complex nav) → converges slow (N=5–7); state interaction adds dimensions

If confirmed, the technique gains a class-aware iteration budget rule, not a one-size-fits-all cap.

## Limitations (planned)

- **5 components is small** — production design systems have 20-50 component classes. The 5-component sweep is a starting point, not coverage.
- **Single Figma style** — components from one design language. Material-style vs minimalist-style components may differ in iteration convergence.
- **Headless browser, not real device** — renders in Chrome headless. Real-device differences (font rendering, sub-pixel antialiasing) may produce different diff readings.
- **Single Claude model version** — model improvements may shift the convergence point. Re-measure when major model versions ship.
- **Token violation as binary** — each violation counts as 1, regardless of severity (one wrong color = same as one wrong padding). Weighted scoring would refine the metric.

## Provenance

- Authored: 2026-04-26 (post-#1200 closure of bias-self-correction)
- Files against issue: TBD (this paper opens convergence as a new shape category — sibling to threshold-cliff, hysteresis, log-search)
- Tests technique `frontend/figma-driven-ai-react-design-system`
- Worked example #7 of paper #1188 verdict rule — convergence framing, not cost-displacement
- **First convergence-shape paper in the corpus** — opens new shape category alongside the 4 already opened (log-search #1194, hysteresis #1195, threshold-cliff #1196-#1198, bias-correction-feasibility #1200)
- Status `draft` until experiment runs. Closure path: drive Claude through 10 rounds × 5 components; status transitions to `reviewed` then `implemented`.
- Sibling paper opportunity: convergence claim across other AI+UI pipelines (e.g. v0.dev, Galileo, Builder.io) — multi-tool convergence comparison would be a natural follow-up
