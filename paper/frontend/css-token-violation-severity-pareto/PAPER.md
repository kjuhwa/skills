---
version: 0.3.0-draft
name: css-token-violation-severity-pareto
description: "Tests whether CSS token violations follow Pareto — top 20% of kinds account for ~80% of total — Pareto-shape paper."
type: hypothesis
status: draft
category: frontend
tags:
  - css
  - design-tokens
  - pareto-distribution
  - violation-analysis
  - non-cost-displacement

premise:
  if: "we instrument the css-token-violation-precommit-gate (#1202) across 100+ PRs from 5+ projects and bucket violations by kind (color/spacing/font/radius/shadow/other)"
  then: "violation count follows a long-tail Pareto distribution — top 20% of kinds account for ~80% of total violations, with color drift dominating"

examines:
  - kind: technique
    ref: frontend/css-token-violation-precommit-gate
    note: "the gate that produces the measurement data this paper analyzes"
  - kind: paper
    ref: workflow/ai-swagger-gap-fill-confidence-distribution
    note: "sibling Pareto paper — together form the corpus's first Pareto cluster"

perspectives:
  - by: technique-author
    view: "the gate flags all violation kinds equally, but operators report color violations dominate. The paper measures whether that intuition holds across projects, or is observation bias from one team."
  - by: skeptic
    view: "Pareto is a hypothesis, not a default. Token violations may follow uniform or even bimodal (color + spacing) distribution. Calling it Pareto without measurement is shape-bias of a different kind."
  - by: corpus-curator
    view: "second Pareto paper in the corpus — joins #1176 to form first Pareto cluster. Both surface long-tail behavior in different domains (AI swagger gap-fill confidence vs CSS violation kind)."

experiments:
  - name: violation-distribution-by-kind
    status: planned
    method: "Run css-token-violation-precommit-gate against 100+ PRs from 5+ projects (varied DS maturity). Bucket by kind; compute cumulative % + Gini + chi-square vs uniform. Full protocol in body Methods."
    measured: "violation count per kind per project; cumulative % at top 20% kinds; Gini; chi-square deviation from uniform"
    result: null
    supports_premise: null
    refutes: "implicit assumption that all violation kinds are roughly equal in operational impact"
    confirms: null

requires:
  - kind: technique
    ref: frontend/css-token-violation-precommit-gate
    note: "the gate that surfaces the violation data"
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "survey that motivates non-cost-displacement framing — Pareto is one of the under-represented shapes"
---

# CSS Token-Violation Severity Pareto

> Tests whether CSS token violations across PRs follow a long-tail Pareto distribution. **Second Pareto-shape paper in the corpus** — joins `paper/workflow/ai-swagger-gap-fill-confidence-distribution` (#1176) to form the first Pareto cluster.

## Introduction

The technique `frontend/css-token-violation-precommit-gate` (#1202 batch) flags every CSS value not in the canonical token map. The gate treats all violations as equal at the lint level — block commit until resolved.

But operators repeatedly report that **color violations dominate everything else**. Spacing violations are next, then radius, font, shadow. If true, the operational implication matters: tooling could prioritize color-token coverage and reach 80% of value with 20% of investment.

This paper tests whether that operational intuition is genuinely Pareto-distributed or merely observation bias from a small sample.

### Why Pareto (NOT cost-displacement, threshold-cliff, log-search, hysteresis, convergence, necessity)

The cost-displacement framing for this question would have been:

> "as token coverage grows, violation count shrinks but coverage cost grows; crossover at optimal coverage"

That framing is **wrong about the shape**. The actual claim is about the **distribution of violation counts across kinds**, not a per-instance trade-off:

- If Pareto: top 20% of kinds account for ~80% of count → focus tooling on those
- If uniform: every kind contributes equally → no prioritization signal
- If bimodal: two dominant kinds + thin tail → focus on both

Per paper #1188's verdict rule, this paper deliberately frames around the technique's actual shape (a distribution-class claim) rather than retrofit a crossover trade-off.

### Why Pareto is the LOAD-bearing hypothesis

If Pareto holds:
- Tooling can stop at color-token coverage and capture most value
- AI-generated CSS guards can be lightweight (color check only, ignore others)
- Designer education can prioritize color discipline above other token kinds

If Pareto fails:
- Tooling must address all kinds equally
- AI guards need to be exhaustive
- Designer education must cover the full token taxonomy

The hypothesis is operationally consequential, not just descriptive.

## Methods

For each of 5+ projects with varying design system maturity (greenfield, mid-stage, mature):

1. Run `css-token-violation-precommit-gate` against the last 100+ PRs (or full PR history if smaller).
2. Aggregate violations by kind: color, spacing, font-family, font-size, font-weight, radius, shadow, other.
3. Compute per-project:
   - Violation count per kind
   - Rank kinds by count, compute cumulative percentage
   - Cumulative % at top 20% of kinds (Pareto check)
   - Gini coefficient (alternative concentration measure)
   - Chi-square vs uniform distribution (formal test)
4. Aggregate across projects.

Hypothesis confirmed if median project has cumulative % at top 20% ≥ 75% (i.e., at least 75/20 instead of 80/20 — slight relaxation for measurement noise).

### What this paper is NOT measuring

- **Severity per violation** — count is the metric, not weighted impact. A single color hex == one button-spacing px in this measurement.
- **Cause attribution** — paper measures distribution, not why one kind dominates. Causes (legacy CSS, AI generation, copy-paste) are out of scope.
- **Cost displacement** — there is no "as coverage grows, cost X shrinks but cost Y grows with crossover" claim. The shape is distribution, not crossover.
- **Cross-project predictability** — paper measures within-project + median-across-project. Not whether one project's distribution predicts another.

## Results

`status: planned` — no data yet. Result will populate when at least one project has been measured through ≥100 PRs.

Expected output table (template):

| Project | Maturity | Total violations | Top kind | Top kind % | Top 20% kinds cumulative % | Gini |
|---|---|---:|---|---:|---:|---:|
| A | greenfield | TBD | TBD | TBD | TBD | TBD |
| B | mid-stage | TBD | TBD | TBD | TBD | TBD |
| C | mature | TBD | TBD | TBD | TBD | TBD |
| ... | ... | TBD | ... | TBD | TBD | TBD |

## Discussion

### Why this paper exists in the Pareto column

Paper #1188 found Pareto appears in only 1/22 papers (sibling paper #1176). This paper makes it 2 — the first Pareto cluster. With #1201 opening convergence, #1196/#1197/#1198 closing the threshold-cliff cluster, and #1200 closing the bias-correction loop, the corpus now has 6 distinct non-cost-displacement shape categories with at least one paper each.

If the hypothesis lands (cumulative ≥75% at top 20%), the corpus gains:
- Second Pareto paper, formalizing the distribution-shape category
- A practical token-prioritization rule (focus color coverage first)
- Continued evidence that #1188's bias-correction methodology generalizes — this is **worked example #8**

### What would refute the hypothesis

- Median project has cumulative % at top 20% < 50% → no concentration; all violation kinds matter roughly equally
- Distribution is bimodal (color + spacing dominant, others thin) → not strict Pareto, technique should prioritize the two dominant pairs
- Distribution is mature-project-only Pareto, greenfield is uniform → maturity shifts the shape; technique should warn that greenfield projects don't show the pattern yet

### What partial-support would look like

- Cumulative % at top 20% varies wildly by project (50%–95%) → Pareto holds in some, not others; project class matters
- Color dominates universally but second-place kind varies → "color is always the top, second varies" is itself a useful prioritization rule
- Mature projects show Pareto, greenfield shows uniform → maturity-conditional, technique gains a "wait until N PRs accumulate" rule

## Limitations (planned)

- **5 projects is small** — Pareto is a population-level claim; 5 projects underpowers tail behavior estimation.
- **PR-level aggregation** — single PR may have many violations of one kind (one big migration PR skews data). Per-commit might be more robust.
- **Selection bias by adoption** — projects that adopt the precommit-gate are likely already token-disciplined; greenfield chaos is underrepresented.
- **Static buckets** — color/spacing/font/etc. are fixed. Real violations may need finer (e.g. brand-color vs neutral-color separately).
- **No temporal dimension** — measures snapshot distribution. Whether the distribution shape is stable over time (as the project matures) is a follow-up question.

## Provenance

- Authored: 2026-04-26 (post-#1202 ten-technique batch closure)
- Tests technique `frontend/css-token-violation-precommit-gate` from #1202 batch
- Worked example #8 of paper #1188's verdict rule — Pareto framing, not cost-displacement
- **Second Pareto-shape paper in the corpus** — joins #1176 to form the first Pareto cluster
- Status `draft` until experiment runs. Closure path: instrument 5+ projects with the gate, accumulate ≥100 PRs each, compute distributions; status transitions to `reviewed` then `implemented`.
- Sibling paper opportunities: temporal Pareto analysis (does the distribution shape stabilize as projects mature?), cross-domain Pareto (do CSS violations and Swagger gaps share a common Pareto generator? — paper #1176 + this paper enable that test).
