---
version: 0.3.0-draft
name: cross-tool-figma-react-convergence-comparison
description: "Tests whether Claude/v0.dev/Galileo show distinct convergence on same Figma→React task — tool vs task driven."
type: hypothesis
status: draft
category: frontend
tags:
  - figma
  - react
  - convergence
  - cross-tool
  - non-cost-displacement

premise:
  if: "we drive 3 AI tools (Claude / v0.dev / Galileo) through the same Figma → React iteration loop on 5 reference components, measuring convergence rate per tool"
  then: "convergence rates differ by ≥2× across tools — convergence is tool-dependent (each tool's prior + sampling determines rate), not task-dependent (same task = same rate regardless of tool)"

examines:
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "the technique whose convergence behavior this paper tests across 3 AI tools"
  - kind: paper
    ref: frontend/figma-claude-react-iteration-convergence
    note: "convergence #1 (Claude only) — pixel-diff sub-question (asymptotic decay)"
  - kind: paper
    ref: frontend/dark-mode-token-aa-contrast-convergence
    note: "convergence #2 (Claude only) — threshold satisfaction sub-question"

perspectives:
  - by: technique-author
    view: "the technique describes the loop without specifying tool. Paper tests if tool choice matters — if rate differs ≥2×, tool selection drives wall-clock as much as task complexity."
  - by: skeptic
    view: "convergence may be task-dominated; same task on different tools may converge at similar rates because the Figma reference dictates the answer. Predict: rates within 1.5× — tool-independent."
  - by: corpus-curator
    view: "third convergence paper — completes convergence as the 6TH STABLE cluster. Sub-questions: asymptotic decay (#1201) + threshold (#1209) + cross-tool variant (this paper)."

experiments:
  - name: cross-tool-iteration-rate-comparison
    status: planned
    method: "5 Figma components × 3 AI tools (Claude/v0.dev/Galileo) × 10 iter cap. Record iter-to-converge per (tool, component). Compare rate distributions. Full protocol in body."
    measured: "median iter-to-converge per tool; tool-pair convergence rate ratios; failure rate at iter cap per tool"
    result: null
    supports_premise: null
    refutes: "implicit assumption that AI tool choice is interchangeable for Figma → React iteration"
    confirms: null

requires:
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "the technique under test"
  - kind: paper
    ref: frontend/figma-claude-react-iteration-convergence
    note: "first convergence paper — pairs with this PR to complete the convergence cluster"
  - kind: paper
    ref: frontend/dark-mode-token-aa-contrast-convergence
    note: "second convergence paper — pairs with this PR (3 → stable cluster)"
---

# Cross-Tool Figma → React Convergence Comparison

> Tests whether Claude / v0.dev / Galileo show distinct convergence rates on the same Figma → React iteration task. **Third convergence-shape paper** — completes the convergence cluster as the **6TH STABLE 3-PAPER CLUSTER**. Sub-question coverage: asymptotic decay (#1201) + threshold satisfaction (#1209) + **cross-tool variant** (this paper).

## Introduction

The technique `frontend/figma-driven-ai-react-design-system` describes the iteration loop (Figma reference → AI generates React → diff feedback → next round) without specifying which AI tool. Operators today usually pick whichever tool they have access to and assume convergence is task-dependent — same task = same rate regardless of tool.

This paper tests that assumption. If convergence rates differ ≥2× across 3 tools (Claude, v0.dev, Galileo), tool selection drives wall-clock as much as task complexity does. If rates cluster within 1.5×, the convergence shape is genuinely task-dependent and tool choice is operationally interchangeable.

### Convergence cluster sub-question triad complete

| Paper | Sub-question | Endpoint |
|---|---|---|
| #1201 figma-claude-react-iteration-convergence | **Asymptotic decay** (existence) | pixel diff → 0 (continuous) |
| #1209 dark-mode-token-aa-contrast-convergence | **Threshold satisfaction** (calibration) | contrast ≥ 4.5:1 (binary cliff) |
| **this paper** | **Cross-tool variant** (variant) | distinct AI tools, same task |

Per #1205's verdict ("cluster saturates at N=3 covering existence + calibration + variant"), this triad makes convergence the **6th stable 3-paper cluster**.

### Why convergence (NOT cost-displacement, threshold-cliff, log-search, hysteresis, Pareto, necessity, self-improvement, universality)

Cost-displacement framing for this question would have been:

> "as we use more AI tools, generalization confidence grows but per-tool fit degrades; crossover at optimal tool count"

Wrong shape. The actual claim is about **per-tool convergence rate** — how fast each tool reaches the fixed point given the same input. Distinct from universality (which tests whether shapes share generators across DOMAINS); this is convergence rate across TOOLS within the same domain.

Per #1188's verdict rule, deliberately framed around the actual shape.

### Why cross-tool variant is the right variant axis for convergence

#1201 measures convergence shape with one tool (Claude) on visual fidelity. #1209 measures with one tool on threshold satisfaction. This paper varies the tool — keeping task constant — and measures how much of the convergence rate is task vs tool. The 3-paper triad collectively covers:

- **What convergence is** (asymptotic decay, #1201)
- **How convergence behaves at thresholds** (binary endpoint, #1209)
- **What drives convergence rate** (tool vs task, this paper)

## Methods

For each of 5 Figma reference components (button, card, modal, nav, form):

For each of 3 AI tools (Claude, v0.dev, Galileo):
1. Feed identical Figma reference + design tokens
2. Loop up to N=10 iterations
3. Per iteration: render in headless browser → pixel diff vs Figma export → feed delta back
4. Record iter-to-converge (pixel diff under tool-independent threshold)

Compute median iter-to-converge per (tool, component). Aggregate across components per tool. Compute tool-pair convergence rate ratios.

Hypothesis confirmed if **any tool-pair ratio ≥ 2×** across at least 3 of 5 components (tool-dependence dominates).

### What this paper is NOT measuring

- **Tool capability ranking** — convergence rate ≠ output quality. A tool that converges fast may produce lower-quality React.
- **Cost displacement** — no smooth trade-off; per-tool rate comparison is the claim.
- **Cross-task universality** — within Figma → React only. Other AI+UI tasks may give different tool-dependence.
- **Cost or pricing** — wall-clock measurement only; per-call cost not part of this paper.

## Results

`status: planned` — no data yet. Result populates when at least 1 component has been tested across all 3 tools.

Expected output table (template):

| Component | Claude iter | v0.dev iter | Galileo iter | Max-pair ratio | Class |
|---|---:|---:|---:|---:|---|
| button | TBD | TBD | TBD | TBD | TBD |
| card | TBD | TBD | TBD | TBD | TBD |
| modal | TBD | TBD | TBD | TBD | TBD |
| nav | TBD | TBD | TBD | TBD | TBD |
| form | TBD | TBD | TBD | TBD | TBD |

## Discussion

### What this paper completes (6th stable cluster)

If hypothesis lands (convergence is tool-dependent ≥2×), the corpus gains:
- Third convergence paper covering variant sub-question
- Convergence reaches stable 3-paper cluster status — **6th stable cluster**
- Practical operator rule: tool selection matters as much as task complexity for AI+UI iteration workflows

### What would refute the hypothesis

- All tool-pair ratios within 1.5× → convergence is task-dominated; tool choice is operationally interchangeable
- One tool (e.g., Claude) consistently 5× others → tool-dominance asymmetric; not cross-tool variance, just one outlier
- Component-class-conditional dominance (Claude wins on simple, v0.dev on compound) → tool-task interaction; no single tool dominates

### What partial-support would look like

- 3 of 5 components show ≥2× ratio, 2 components within 1.5× → tool-dependence is component-class-conditional; technique should specify class-aware tool choice rule
- Median ratio between 1.5× and 2× → moderate tool-dependence; tool choice matters but not dramatically

## Limitations (planned)

- **3 tools is small** — production AI+UI ecosystem has 5+ viable tools (Claude, v0.dev, Galileo, Builder.io, Lovable). Sample expansion strengthens the claim.
- **5 components is small** — design system component diversity is wider than the curated 5
- **Tools evolve fast** — convergence rate may shift on tool version updates. Re-measure on major version transitions.
- **Single Figma style** — components from one design language. Material-style vs minimalist-style may differ.
- **No cost dimension** — pricing differences across tools may dominate operationally even if convergence rates cluster.

## Provenance

- Authored: 2026-04-26 (post-#1212 universality cluster completion)
- Worked example #17 of paper #1188's verdict rule — convergence framing, not cost-displacement
- **Third and final convergence-shape paper** — completes the convergence cluster as the **6TH STABLE 3-PAPER CLUSTER** (after threshold-cliff, necessity, Pareto, self-improvement, universality)
- Status `draft` until experiment runs. Closure path: 5 components × 3 tools × 10 iter cap.
- Sibling paper opportunity: cross-tool convergence comparison for other AI+UI categories (svg / 3d / mobile UI) to test whether tool-dependence is universal or React-specific
