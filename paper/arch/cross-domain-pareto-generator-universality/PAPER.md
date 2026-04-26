---
version: 0.3.0-draft
name: cross-domain-pareto-generator-universality
description: "Tests whether 3 Pareto papers share a universal generator — alpha ±0.3 + Gini ±0.1 clustering test."
type: hypothesis
status: draft
category: arch
tags:
  - cross-domain
  - pareto
  - universality
  - generator-comparison
  - meta-corpus

premise:
  if: "3 Pareto papers (#1176 AI confidence, #1203 CSS violation, #1207 orchestrator starvation) complete measurement, and we fit Pareto distribution to each empirical dataset"
  then: "alpha exponent clusters within ±0.3 AND Gini coefficient within ±0.1 across the 3 domains — common underlying generator, not domain-specific coincidence"

examines:
  - kind: paper
    ref: workflow/ai-swagger-gap-fill-confidence-distribution
    note: "Pareto paper #1 — AI inference confidence (existence sub-question)"
  - kind: paper
    ref: frontend/css-token-violation-severity-pareto
    note: "Pareto paper #2 — CSS violation severity (calibration sub-question)"
  - kind: paper
    ref: ai/orchestrator-priority-queue-starvation-pareto
    note: "Pareto paper #3 — orchestrator starvation (variant sub-question)"

perspectives:
  - by: corpus-curator
    view: "if alpha + Gini cluster across 3 domains, the corpus has empirical basis for treating Pareto as a default for distribution-shape predictions, not a per-domain hypothesis."
  - by: skeptic
    view: "3 data points barely supports clustering. May be coincidence. Predict: alphas spread > 0.5 — each domain has distinct generator (AI sampling vs CSS authoring vs orchestrator scheduling)."
  - by: empiricist
    view: "cluster assembled by author intent (#1188 verdict). Test is honest only if domains weren't pre-selected for Pareto fit; condition approximately met — each chosen for sub-question, not fit."

experiments:
  - name: cross-domain-fit-comparison
    status: planned
    method: "After 3 Pareto papers reach implemented, fit each to power law (alpha + xmin) + compute Gini. Compare across 3 domains via clustering ratio. Full protocol in body."
    measured: "alpha per domain; Gini per domain; max-min clustering ratio; goodness-of-fit per domain"
    result: null
    supports_premise: null
    refutes: "implicit assumption that the 3 Pareto papers found the same shape by coincidence rather than common generator"
    confirms: null

requires:
  - kind: paper
    ref: workflow/ai-swagger-gap-fill-confidence-distribution
    note: "Pareto paper #1 — must reach status=implemented before this paper can run"
  - kind: paper
    ref: frontend/css-token-violation-severity-pareto
    note: "Pareto paper #2 — must reach status=implemented before this paper can run"
  - kind: paper
    ref: ai/orchestrator-priority-queue-starvation-pareto
    note: "Pareto paper #3 — must reach status=implemented before this paper can run"
---

# Cross-Domain Pareto Generator Universality

> Tests whether the 3 Pareto papers (#1176/#1203/#1207) — AI confidence, CSS violations, orchestrator starvation — share a universal underlying generator, or whether each domain has independent Pareto-like behavior. **First cross-domain shape-universality paper** — opens an 8th distinct shape category in the corpus.

## Introduction

The corpus now has three Pareto-shape papers, each in a distinct domain:

- `#1176 ai-swagger-gap-fill-confidence-distribution` — AI inference (confidence over swagger gaps)
- `#1203 css-token-violation-severity-pareto` — Frontend CSS (token violations across PRs)
- `#1207 orchestrator-priority-queue-starvation-pareto` — Orchestration (starvation across task classes)

Each paper independently hypothesized long-tail Pareto. If all three measure positive, the question becomes: **is the same underlying generator at work, or did three coincident Paretos arise from different mechanisms?**

This paper proposes a meta-experiment to answer it: fit each empirical distribution to power law, compare alpha exponent + Gini coefficient across the 3 domains. Cluster (small max-min spread) → common generator. Spread → coincidence.

### Why this opens a new shape category

The 7 shape categories surfaced so far (cost-displacement, threshold-cliff, log-search, hysteresis, convergence, necessity, Pareto, self-improvement) all describe properties of single phenomena. **Cross-domain shape-universality** is different — it describes a relationship across multiple phenomena.

This is the first paper of a potentially distinct shape category — claims about how shapes generalize across domains. If the cluster forms (3+ universality papers), it would represent a meta-shape category.

### Why this is the right time

Status-wise, all 3 Pareto papers are status=draft. No measurements yet. This paper is filed as a forward-looking framework — it cannot be measured until the 3 dependencies close their loops. But the FRAMING needs to be filed now, while the 3 papers are fresh, so that:

1. Each Pareto paper's measurement methodology can be coordinated (same Pareto-fit tool, same Gini formula)
2. Author commitment is visible — the universality test is hypothesized BEFORE measurement, not retrofitted after
3. If 3 papers measure but no universality emerges, the negative result is still recorded as a hypothesis-rejection, not a non-finding

Filing the framework upfront prevents post-hoc rationalization.

### Why universality (NOT cost-displacement, threshold-cliff, log-search, hysteresis, convergence, Pareto, necessity, self-improvement)

The cost-displacement framing for this question would have been:

> "as more domains tested, generalization confidence grows but per-domain fit degrades; crossover at optimal domain count"

Wrong shape. The actual claim is binary: **clustering vs spreading**. There is no smooth trade-off; either the alpha+Gini cluster within tolerance or they don't. Per #1188's verdict rule, this paper deliberately frames around the actual shape (binary cluster-test) rather than retrofit cost-displacement.

## Methods

After all 3 Pareto papers reach `status: implemented`:

1. **Extract empirical distribution per paper**
   - #1176: AI confidence histogram from swagger gap-fills
   - #1203: violation count per kind across PRs
   - #1207: starvation count per task class
2. **Fit power law per distribution** — use maximum-likelihood (Clauset/Shalizi/Newman 2009 method): estimate alpha exponent + xmin (lower bound where power law applies)
3. **Compute Gini per distribution** — alternative concentration measure
4. **Compute clustering ratio** — for alpha: (max - min) / median. For Gini: (max - min). Lower = better clustering
5. **Goodness-of-fit per domain** — Kolmogorov-Smirnov test against fitted power law

Hypothesis confirmed if alpha clustering ratio ≤ 0.3 AND Gini spread ≤ 0.1 AND all 3 KS p-values > 0.1 (genuine power law fit, not just visually long-tail).

### What this paper is NOT measuring

- **Generator identification** — measures whether a common generator EXISTS, not what it is. Identifying the mechanism (preferential attachment, multiplicative process, etc.) is a follow-up.
- **Cross-domain prediction** — measures within the 3 sampled domains. Generalization to a 4th domain not tested.
- **Causal direction** — alpha clustering may reflect underlying mathematical reality OR shared sampling bias (e.g., all 3 use long-PR data). Out of scope to disentangle.
- **Other distribution families** — only Pareto/power-law tested. Lognormal, stretched exponential, etc., would be alternative-hypothesis papers.

## Results

`status: draft` — all 3 dependency papers are status=draft. Result will populate when:
- All 3 Pareto papers complete experiments
- Empirical distributions extracted
- Power law fit performed per domain

Expected output table (template):

| Paper | Domain | N samples | alpha (95% CI) | xmin | Gini | KS p-value |
|---|---|---:|---|---:|---:|---:|
| #1176 | AI confidence | TBD | TBD | TBD | TBD | TBD |
| #1203 | CSS violations | TBD | TBD | TBD | TBD | TBD |
| #1207 | orchestrator starvation | TBD | TBD | TBD | TBD | TBD |
| **Clustering ratio** | — | — | TBD | — | TBD | — |

## Discussion

### What this paper opens (potential 8th shape category)

If universality clusters (cluster ratio ≤ 0.3), the corpus has its **first measured cross-domain pattern**. That's a structurally new claim type — the paper is no longer "X has shape Y" but "X has shape Y, and Z has the same shape Y, because they share generator W (or symptom W)."

Two possible outcomes change the corpus:

- **Universality holds** → corpus can default-predict Pareto for new domains in the meta-shape; future Pareto papers can cite the universal alpha as prior
- **Universality fails** → corpus accepts that shape coincidence is per-domain; each new Pareto paper is independent, no transfer

Both are useful findings for future-author judgment.

### What would refute the hypothesis

- alpha clustering ratio > 0.5 → distributions look Pareto each but are mathematically distinct; common generator implausible
- Gini spread > 0.2 → concentration measures don't agree; alpha alone insufficient indicator
- KS p-value < 0.05 in any domain → that domain's distribution isn't actually Pareto (long-tail visually but doesn't fit power law); excludes it from universality test
- Clustering forms but only 2 of 3 domains agree → partial universality, technique should specify which pair coincides

### What partial-support would look like

- alpha clusters but Gini spreads → distributions have similar tail-index but different concentration; may indicate shared tail behavior with different bulk shapes
- 2 of 3 cluster (e.g., AI + orchestrator close, CSS apart) → CSS may have distinct generator (human-driven authoring vs algorithmic); test CSS independently before declaring universality

## Limitations (planned)

- **N=3 domains is minimum for cluster claim** — meta-cluster of 5+ papers would be statistically more defensible
- **Pre-registration via this paper** is partial — author already knows each Pareto paper's design; ideal pre-registration would be from someone uninvolved in the 3 papers
- **Power law fitting is itself fragile** — Clauset/Shalizi/Newman method is the standard but xmin selection biases result; multiple xmin sweeps recommended
- **Calendar-bound** — depends on 3 dependency papers reaching implemented; cannot be accelerated
- **Sampling bias** — all 3 dependency papers were authored by same person who designed the bias-detection methodology; the 3 may share methodology bias even if domain-distinct

## Provenance

- Authored: 2026-04-26 (post-#1209 convergence cluster start)
- Worked example #14 of paper #1188's verdict rule — universality framing, not cost-displacement
- **First cross-domain shape-universality paper** — opens 8th distinct shape category in the corpus
- Status `draft` — calendar-bound on 3 dependency papers (#1176, #1203, #1207) reaching implemented
- Pre-registers the universality test before measurements complete (prevents post-hoc rationalization)
- Sibling paper opportunity: cross-domain universality for other shape categories (threshold-cliff across #1196/#1197/#1198, necessity across #1160/#1174/#1204) — would extend the meta-shape category
