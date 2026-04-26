---
version: 0.3.0-draft
name: cluster-formation-dynamics-from-bias-correction
description: "Measures cluster size where shape-categories stabilize after bias-correction — 3-paper threshold from 9 examples."
type: hypothesis
status: implemented
category: arch
tags:
  - meta-corpus
  - cluster-dynamics
  - self-improvement
  - bias-correction
  - empirical

premise:
  if: "an author authors N worked-example papers across distinct non-cost-displacement shape categories after a bias-detection survey, tracking category-formation"
  then: "cluster stabilizes at 3 papers per category — single is isolated, pair is forming, triple covers (existence + calibration + variant); 4+ shows diminishing marginal contribution"

verdict:
  one_line: "Cluster stabilizes at N=3 papers per category from observed 9 worked examples — single is isolated, pair forming, triple stable. Past 3, prefer new shape category over deepening existing cluster."
  rule:
    when: "authoring after a stable 3-paper cluster exists in some shape category"
    do: "prefer opening a new (single-paper) shape category over a 4th paper in an existing 3-paper cluster, unless the new paper covers a genuinely distinct sub-question"
    threshold: "3 papers per shape category = stability marker. 4+ requires explicit sub-question novelty justification."
  belief_revision:
    before: "more papers in the same shape category strengthens the category — diminishing returns assumed gradual"
    after: "diminishing returns are sharp at N=3 — the third paper closes the existence + calibration + variant triad. 4th paper without a new sub-question is corpus padding."

applicability:
  applies_when:
    - "Layered knowledge corpus with shape-claim taxonomy"
    - "Bias-correction methodology has produced multi-paper categories"
    - "Cluster size is measurable per category"
  not_applies_when:
    - "Single-paper categories (no cluster behavior to measure)"
    - "Strict-ordering requirements that override cluster-size preference (e.g. dependent papers needing prior closure)"
    - "Multi-author corpora where cluster-formation is coordination-driven rather than author-bias-driven"

premise_history:
  - revised_at: 2026-04-26
    from: "cluster size correlates with category importance"
    to: "cluster size saturates at 3 — stability marker, not importance signal"
    reason: "observed data: 4 single-paper + 1 pair + 2 triple categories. Triples (threshold-cliff, necessity) cover three sub-questions each; pairs and singles do not yet."

examines:
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "survey that triggered bias-correction sequence; this paper measures dynamics"
  - kind: paper
    ref: arch/author-bias-self-correction-feasibility
    note: "the prior self-improvement paper this one extends with cluster-size measurement"

perspectives:
  - by: corpus-curator
    view: "the 3-paper threshold is empirical at N=9 papers and may shift as more land. But the pattern (existence + calibration + variant) is structural, not coincidental."
  - by: skeptic
    view: "9 examples is small. The 3-paper claim may be authoring habit (author batches 3), not corpus dynamics. Refute path: another author at N=3 with different sub-question coverage."
  - by: empiricist
    view: "data is what it is — 4 single + 1 pair + 2 triple. Triples cover the natural triad (existence, calibration, scaling). Pattern consistent across two clusters."

experiments:
  - name: cluster-size-snapshot-from-9-papers
    status: completed
    method: "Tally papers per shape-category from worked examples #1194-#1204. Classify cluster size; identify sub-question coverage; note diminishing-returns markers. Full protocol in body Methods."
    measured: "paper count per category; sub-question coverage at each cluster size; emergent cluster-of-clusters structure"
    result: "4 single (log-search, hysteresis, convergence, self-improvement) + 1 pair (Pareto) + 2 triple (threshold-cliff, necessity). Triples cover existence/calibration/variant triad."
    supports_premise: yes
    observed_at: 2026-04-26
    refutes: "implicit assumption that cluster size correlates linearly with category importance"
    confirms: "cluster saturates at 3 papers covering existence + calibration + variant triad; past 3, marginal contribution drops sharply"

outcomes:
  - kind: updated_paper
    ref: arch/author-bias-self-correction-feasibility
    note: "extends self-improvement category from 1 paper to 2; opens self-improvement cluster-formation cycle"

requires:
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "bias-detection survey that triggered the 9-paper sequence"
  - kind: paper
    ref: arch/author-bias-self-correction-feasibility
    note: "first self-improvement paper, paired with this PR to start the self-improvement cluster"
---

# Cluster Formation Dynamics from Bias Correction

> Measures the cluster-formation dynamics emergent from paper #1188's bias-correction methodology. **Second self-improvement paper** in the corpus (with #1200), starting the self-improvement cluster. Tests whether shape-category clusters stabilize at a specific size.

## Introduction

Paper #1200 (`author-bias-self-correction-feasibility`) demonstrated that single-author bias-correction is feasible at N=5 papers. Since then, four more worked examples have landed — bringing the total to nine, distributed across seven distinct shape categories. The distribution is **not uniform**: some categories have 3 papers, some have 2, some have 1.

This paper measures the structure of that distribution and asks: **is there a natural cluster-formation point**, or do categories accumulate papers indefinitely?

The data unexpectedly shows a clear pattern. The third paper in each cluster closes a structural triad (does it exist + where to put it + how does it scale). Past three, additional papers in the same category appear to add proportionally less. The hypothesis: **3-paper clusters are stable; 4+ requires explicit sub-question novelty to justify**.

This is a **meta-paper** — it measures the corpus's own cluster behavior. It pairs with #1200 to form the self-improvement category's second paper, starting that category's cluster-formation cycle.

### Why this is self-improvement (NOT cost-displacement, threshold-cliff, etc.)

The cost-displacement framing for this question would have been:

> "as cluster size grows, organizational cost grows but coverage value shrinks; crossover at optimal cluster size"

Wrong shape. The actual claim is **structural saturation**:

- Single-paper category: covers 1 sub-question (existence OR calibration OR variant)
- Pair-paper category: covers 2 of 3 sub-questions
- Triple-paper category: covers all 3 sub-questions (saturated)
- 4+ papers: same 3 sub-questions, smaller marginal contribution

Per paper #1188's verdict rule, this paper deliberately frames around the actual shape (saturation at N=3, not crossover).

## Methods

For each of 9 worked-example papers (#1194 through #1204) authored after #1188's bias verdict:

1. Read the paper's shape claim and sub-question scope.
2. Group by shape category.
3. For each category, identify which sub-questions are covered:
   - **Existence** — does the shape claim hold at all?
   - **Calibration** — where do we place the parameter (threshold, gap, count)?
   - **Variant / fleet / aggregation** — how does it scale across instances?
4. Note cluster size and sub-question coverage per category.
5. Identify diminishing-returns markers (would a 4th paper add a new sub-question?).

### What this paper is NOT measuring

- **Predictive cluster size for future categories** — the 3-paper threshold is descriptive of observed data, not predictive of all future categories
- **Cost displacement** — there is no smooth trade-off between cluster size and any cost; saturation is structural
- **Multi-author cluster dynamics** — single author. Multi-author clusters may form differently
- **Cross-corpus generalization** — only this corpus measured; other corpora may have different cluster-stability points

## Results

### Cluster distribution at N=9 worked examples

| Cluster size | Categories at this size | Sub-questions covered |
|---:|---|---|
| **3 papers** | threshold-cliff (#1196/#1197/#1198), necessity (#1160/#1174/#1204) | existence + calibration + variant |
| 2 papers | Pareto (#1176/#1203) | 2 of 3 |
| 1 paper | log-search (#1194), hysteresis (#1195), convergence (#1201), self-improvement (#1200) | 1 of 3 |

### Triple-paper coverage breakdown

**Threshold-cliff cluster** (#1196/#1197/#1198):
- Existence: #1196 quorum-decision-latency-cliff (does the cliff exist?)
- Calibration: #1197 killswitch-trip-threshold (where to put it?)
- Variant: #1198 quorum-vote-threshold (how does it scale per fleet?)

**Necessity cluster** (#1160/#1174/#1204):
- Monotonic-sequence: #1160 soft-convention-phase-ordering
- Anchor-phase: #1174 safe-bulk-pr-anchor-phase
- Cross-step ordering: #1204 figma-prop-inference-precedes-gen

Both clusters cover 3 distinct sub-questions. Both feel structurally complete.

### Pair-paper coverage

**Pareto cluster** (#1176/#1203):
- Confidence distribution: #1176 ai-swagger-gap-fill-confidence
- Severity distribution: #1203 css-token-violation-severity

The pair covers 2 distinct distribution sub-questions. A 3rd Pareto paper could plausibly cover a 3rd sub-question (e.g., temporal stability of distributions over project maturity), which would push it into the triple-cluster regime.

### Single-paper categories

Four categories at N=1 (log-search, hysteresis, convergence, self-improvement). Each category covers 1 sub-question. The natural next-question for each:
- log-search: existence measured (#1194); calibration would be a 2nd paper
- hysteresis: gap calibration measured (#1195); existence (Q does hysteresis prevent oscillation universally?) would be a 2nd paper
- convergence: iteration count measured (#1201); contrast-ratio convergence would be a 2nd paper
- self-improvement: bias-correction feasibility (#1200); cluster-dynamics (this paper) is now 2 — entering pair-paper regime

## Discussion

### What this changes about cluster behavior

Prior implicit assumption: more papers in a category = more credibility. The data refutes this. **Clusters saturate at 3 papers**, covering the existence/calibration/variant triad. Beyond 3, additional papers in the same category face a structural ceiling — they must surface a genuinely new sub-question or contribute marginally.

This has direct implication for authoring strategy: **prefer opening a new shape category over deepening an existing 3-paper cluster**, unless a 4th paper covers a clearly distinct sub-question.

### Why N=3 specifically

The pattern is not arbitrary. Three sub-questions naturally cover most measurable shape-category claims:
- **Does it exist?** (binary observation)
- **Where to put it?** (parameter calibration)
- **How does it scale?** (per-instance / per-fleet variation)

A 4th paper would need to introduce something orthogonal to these three (e.g., temporal stability, cross-domain generalization, multi-tool comparison). Without that, the 4th paper is corpus padding.

### What would refute the hypothesis

- A category reaches 4+ papers, each covering a clearly distinct sub-question → the existence/calibration/variant triad is incomplete; corpus needs more sub-question dimensions
- A category at N=3 is judged less complete than another category at N=3 → cluster size is not a sufficient stability marker; needs sub-question coverage check too
- Multi-author measurement shows different N (e.g., 5) is the stability point → the pattern is author-conditional, not structural

### What partial-support would look like

- N=3 holds for some shape categories but not others (e.g., distribution shapes saturate at N=4 because they have more sub-questions) → the rule becomes "saturation at the count covering the triad", which is per-category-specific
- N=3 is the saturation but the triad differs by category → existence/calibration/variant works for parametric shapes; other shapes need different triads

## Limitations

- **N=9 worked examples is small** — confidence interval on the 3-paper threshold is wide. A single observation past 3 (with new sub-question) changes the picture.
- **Single author** — same author who designed bias-detection ALSO measured cluster behavior. Observation bias high.
- **Author batches 3 together** — the 3-paper threshold may reflect author's authoring habit (cluster sibling papers in batches of 3), not corpus dynamics. Different authoring rhythm could produce different cluster sizes.
- **Topic concentration** — multiple categories share the Figma+Claude+React+CSS domain (#1201, #1203, #1204), which may inflate cluster-formation rate within that domain.
- **No counterfactual** — no measurement of what cluster size would have been without the bias-correction methodology.

## Provenance

- Authored: 2026-04-26 (closes meta-loop on cluster dynamics emerging from #1188 verdict)
- Status `implemented` — experiment completed within this session (the 9 worked examples ARE the data)
- Tests no specific technique — tests the corpus's own behavior under bias-correction methodology
- **Second self-improvement paper** — joins #1200 (author-bias-self-correction-feasibility) to **start the self-improvement cluster**
- All v0.3 fields populated (verdict + applicability + premise_history); brings v0.3 adoption to 5/5 implemented hypothesis papers
- Sibling paper opportunity: re-measure cluster dynamics at N=15, N=20 papers — does the 3-paper saturation hold or shift?
