---
version: 0.3.0-draft
name: figma-prop-inference-precedes-gen-necessity
description: "Tests whether figma-prop-inference must precede component generation — out-of-order causes type drift. Necessity paper."
type: hypothesis
status: draft
category: frontend
tags:
  - figma
  - react
  - typescript
  - phase-ordering
  - necessity

premise:
  if: "we generate React components first and run figma-prop-interface-inference second (reversed order) across 20+ component generation sessions"
  then: "post-generation type drift cost exceeds inference-first cost — necessity holds, ordering matters"

examines:
  - kind: technique
    ref: frontend/figma-prop-interface-inference
    note: "the technique whose ordering necessity this paper tests"
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "parent pipeline that includes prop inference as a phase"

perspectives:
  - by: technique-author
    view: "the technique batch (#1202) describes the inference step but doesn't enforce ordering. The paper closes that with a measurable necessity claim that operators can build into pipeline gates."
  - by: skeptic
    view: "ordering may be a soft preference, not a necessity. If inference cost > drift cost, reversed order may be acceptable. The paper assumes inference-first wins; that needs measurement."
  - by: corpus-curator
    view: "third necessity-shape paper, joining #1160 (soft-convention-phase-ordering) and #1174 (safe-bulk-pr-anchor-phase). Forms the second 3-paper cluster (after threshold-cliff at #1196/#1197/#1198)."

experiments:
  - name: ordering-vs-drift-cost
    status: planned
    method: "Two arms × 20+ sessions each. Arm A: prop-inference first, then component gen. Arm B: component first, then inference. Measure TS errors, fix-up PR count, wall-clock to merge-ready."
    measured: "TS error count at merge attempt, fix-up PR count, wall-clock to type-clean state"
    result: null
    supports_premise: null
    refutes: "implicit assumption that inference and generation are commutative steps"
    confirms: null

requires:
  - kind: technique
    ref: frontend/figma-prop-interface-inference
    note: "the technique under test"
  - kind: paper
    ref: workflow/soft-convention-phase-ordering-necessity
    note: "sibling necessity paper (#1160), establishes phase-ordering as load-bearing claim"
  - kind: paper
    ref: workflow/safe-bulk-pr-anchor-phase-necessity
    note: "sibling necessity paper (#1174), pairs with this to form the necessity cluster"
---

# Figma Prop Inference Precedes Component Generation (Necessity)

> Tests whether running `figma-prop-interface-inference` BEFORE component generation is necessary, or whether the steps can be commutative. **Third necessity-shape paper in the corpus** — joins #1160 and #1174 to form the second 3-paper cluster (after threshold-cliff #1196/#1197/#1198).

## Introduction

The technique batch in #1202 introduced `frontend/figma-prop-interface-inference` (Figma variant axes → TypeScript discriminated-union React props) and `frontend/storybook-from-figma-component-extractor` (variants → Storybook stories). The pipeline implies an order — infer prop interface, then generate components against it — but doesn't enforce that order.

This paper tests whether the order is necessary or commutative.

### Why necessity (NOT cost-displacement, threshold-cliff, log-search, hysteresis, convergence, Pareto)

The cost-displacement framing for this question would have looked like:

> "as inference is delayed, drift cost grows but parallel work cost shrinks; crossover at optimal phase boundary"

That framing is **wrong about the shape**. The actual claim is structural:

- Inference-first → component generation has type targets, generates type-clean code
- Component-first → inference must reverse-engineer types, may hallucinate or miss variants
- The OUT-OF-ORDER case is not just slower — it produces structurally different output

This is **necessity**: A must precede B, the reverse is not a slower path to the same destination, it's a path to a different (worse) destination.

Per paper #1188's verdict rule, this paper deliberately frames around the technique's actual shape (necessity) rather than retrofit a smooth crossover.

### Why this matters in practice

Operators using Claude to build React components from Figma references face a real ordering choice every session. A clear necessity rule (with measurable evidence) lets the technique mandate phase order, lets pipelines fail fast on violations, and lets reviewers reject PRs that ran the steps backwards.

Without measurement, the rule is just author intuition.

## Methods

Two arms, 20+ component-generation sessions each:

- **Arm A (inference-first)**: Run `figma-prop-interface-inference` → emit prop interface → generate React component code targeting the interface
- **Arm B (component-first)**: Generate React component code from Figma reference → run inference against the generated component → reconcile

For each session, measure:
- TS error count at merge attempt (lower is better)
- Fix-up PR count required to reach type-clean state
- Wall-clock from generation start to merge-ready

Sample 20+ components varying in complexity (simple semantic, compound layout, multi-state).

Hypothesis confirmed if Arm A median TS errors ≤ 50% of Arm B AND Arm A median wall-clock ≤ 80% of Arm B (necessity holds, ordering is structurally consequential).

### What this paper is NOT measuring

- **Cost displacement** — there is no smooth trade-off between order and any cost. The claim is structural ordering, not optimization.
- **Adaptive ordering** — fixed order per arm. Adaptive (e.g., infer first if variants ≥ 3, otherwise component first) is a different technique.
- **Multi-step necessities** — only the inference-vs-generation pair is tested. Other phase pairs in the pipeline (token-fetch vs theme-generation) may have their own necessities, out of scope.
- **Cross-tool necessity** — only Claude. Other AI tools may handle reverse order differently.

## Results

`status: planned` — no data yet. Result will populate when at least 5 sessions per arm have completed.

Expected output table (template):

| Arm | Component class | TS errors (median) | Fix-up PRs (median) | Wall-clock (median min) |
|---|---|---:|---:|---:|
| A inference-first | simple semantic | TBD | TBD | TBD |
| A inference-first | compound layout | TBD | TBD | TBD |
| A inference-first | multi-state | TBD | TBD | TBD |
| B component-first | simple semantic | TBD | TBD | TBD |
| B component-first | compound layout | TBD | TBD | TBD |
| B component-first | multi-state | TBD | TBD | TBD |

## Discussion

### Why this paper exists in the necessity column

Paper #1188 found necessity in 5/25 techniques and 2/22 papers (#1160, #1174). This paper makes it 3 — second 3-paper cluster after threshold-cliff (#1196/#1197/#1198). Cluster formation evidence that the corpus's bias-correction methodology generalizes across distinct shape categories.

If the hypothesis lands (inference-first significantly beats component-first), the corpus gains:
- Third necessity paper, completing the necessity cluster
- A practical pipeline ordering rule with measured backing
- Continued evidence that #1188's bias-correction methodology generalizes — worked example #9

### What would refute the hypothesis

- Arm A and B medians are within 20% across all metrics → ordering is commutative for practical purposes; technique should drop ordering enforcement
- Arm B beats Arm A on wall-clock (parallel work) despite worse TS errors → operators may prefer Arm B even at type cost; necessity claim too strong
- Class-conditional ordering (simple is commutative, multi-state is necessity) → necessity holds only above some complexity threshold; technique should specify class-aware rule

### What partial-support would look like

- Arm A wins on TS errors but loses on wall-clock → ordering matters for type quality but not for raw speed; technique should enforce ordering only when type quality is the priority
- Necessity holds for compound + multi-state but not simple → simpler components don't need the ordering, technique adds class-aware exemption

## Limitations (planned)

- **20+ sessions is small** — necessity claims need broader sampling to detect class-conditional behavior reliably.
- **Single Claude version** — model improvements may shift the result; re-measure on major version transitions.
- **Synthetic component selection** — sessions use a curated component list; production component diversity may be wider.
- **No memory across sessions** — each session is fresh. Real workflows accumulate context across components in the same design system; that effect is unmeasured.
- **Subjective "merge-ready"** — type-clean is objective, but "ready to merge" includes reviewer judgment; the wall-clock metric inherits that subjectivity.

## Provenance

- Authored: 2026-04-26 (post-#1203 Pareto cluster start)
- Tests technique `frontend/figma-prop-interface-inference` from #1202 batch
- Worked example #9 of paper #1188's verdict rule — necessity framing, not cost-displacement
- **Third necessity-shape paper** — joins #1160 (soft-convention-phase-ordering) and #1174 (safe-bulk-pr-anchor-phase) to form the **second 3-paper cluster** (after threshold-cliff #1196/#1197/#1198)
- Status `draft` until experiment runs. Closure path: 20+ sessions per arm; status transitions to `reviewed` then `implemented`.
- Sibling paper opportunity: cross-pipeline necessity comparison — do other AI+UI pipelines (v0.dev, Galileo) exhibit the same ordering necessity, or only Claude-based?
