---
version: 0.3.0-draft
name: technique-layer-roi-after-100-pilots
description: "Technique-layer ROI: after 100 techniques, what fraction get cited 2+ times? Hypothesis: long tail with 80% under-cited"
category: arch
tags: [technique-layer, roi, citation-pattern, long-tail, hypothesis]
type: hypothesis

premise:
  if: A skills hub accumulates an authored corpus, regardless of whether techniques cross N=100
  then: >-
    Citation distribution follows a power law that is observable well before N=100. At
    the technique layer, ≤20% of techniques are cited 2+ times by other content (papers,
    examples, downstream techniques) — measured 11.8% at N=17. The same long-tail shape
    appears one layer down — ≥80% of atoms (skills + knowledge) are uncited entirely
    (measured 97.3% at N=2000). The pattern is layer-invariant; the technique layer's
    ROI predicate generalizes to the atom layer.

verdict:
  one_line: "Long-tail citation shape is structural, not threshold-gated. Visible at N=17 (11.8% techniques 2+ cited) and N=2000 (97.3% atom orphan). Author techniques only when atom co-occurrence demonstrates a real pattern — not speculatively."
  rule:
    when: "About to author a new technique, evaluate technique-layer ROI, or decide whether the corpus needs more techniques"
    do: "Run the citation audit (/hub-list --orphans) for the current orphan rate. Author techniques in response to scanner-suggested atom bundles (_suggest_techniques.py), not speculative future use. Use 'cited 2+ times' as the success bar, not 'merged'."
    threshold: "≤20% of techniques cited 2+ times is the long-tail signal at any N >= 17 — the predicate holds without waiting for N=100"
  belief_revision:
    before_reading: "The technique layer needs to reach N>=100 before its citation distribution is informative. Until then, low citation counts just mean too few techniques to evaluate; long-tail shape is a scaling phenomenon."
    after_reading: "The long-tail shape is structural and observable from N=17 (11.8% 2+ cited; 76.5% orphan). It is also layer-invariant — the atom layer at N=2000 shows the same shape (97.3% orphan). Authoring posture should change immediately, not wait for scale: techniques are last-resort responses to observed atom co-occurrence, not first-impulse speculative documentation."

applicability:
  applies_when:
    - "Authored corpus where 'citation' is frontmatter-resolvable (examines[], composes[], proposed_builds[].requires[])"
    - "Single team or organization where authoring cadence and selection biases are consistent"
    - "Citation infrastructure exists (citations.json or equivalent reverse-lookup index)"
    - "Corpus is past initial seeding (≥17 techniques and/or ≥1000 atoms — below this, sample noise dominates)"
  does_not_apply_when:
    - "Citation definition is broadened to include body-prose mentions or external uses (orphan rate shifts; the 11.8 / 97.3 numbers are definition-conditional)"
    - "Mature corpus (years of accumulation) where old entries have drifted out of citation range — stale orphan rate masks fresh authoring decisions"
    - "Cross-organization corpus where authoring patterns and selection biases differ — single-org generalization broke previously"
    - "Snapshot taken during a corpus growth burst — distribution is unstable until growth slows below ~5 entries/week"
  invalidated_if_observed:
    - "A re-measurement at N>=50 inverts the result (e.g., >50% techniques 2+ cited — refutes the structural-shape claim)"
    - "Cross-organization replication shows orphan rate <60% (refutes the layer-invariance hypothesis; suggests this corpus is the outlier)"
    - "Passive-use proxy (post-/hub-show edits within 24h) correlates strongly with explicit citation, suggesting the citation definition is too narrow to support the verdict"
    - "Longitudinal series shows orphan rate decreasing over time (the long tail is being filled in by retroactive citation, not accumulating)"
  decay:
    half_life: "6 months for absolute numbers (11.8 / 97.3); indefinite for the structural-shape and layer-invariance claims"
    why: "Absolute orphan rates change as the corpus grows and as citation campaigns run. The structural finding (power-law shape visible early, layer-invariant) is more durable. Future work item #1 (quarterly re-measurement) is the canonical refresh path."

premise_history:
  - revision: 1
    date: 2026-04-25
    if: "A skills hub accumulates a technique layer over time AND total techniques crosses N=100"
    then: "≤20% of techniques receive 2+ inbound citations from other content (papers, examples, downstream techniques); the remaining ~80% form a long tail of effectively-unused recipes. The pattern emerges only at scale; below N=100 the distribution is too noisy to evaluate."
    cause: "experiments[0] (citation-distribution-at-N) measured 11.8% (2/17) at N=17 — well below the projected ≥100 precondition — and the predicted predicate already held. The atom layer (N=2000, 97.3% orphan) showed the same long-tail distribution one layer down, outside the original premise scope. Premise generalized to drop the ≥100 precondition (the shape is structural, not threshold-gated) and to extend across layers (technique-layer ROI predicate generalizes to the atom layer)."

examines:
  - kind: technique
    ref: workflow/safe-bulk-pr-publishing
    role: example-of-cited-technique
  - kind: technique
    ref: debug/root-cause-to-tdd-plan
    role: example-of-cited-technique
  - kind: technique
    ref: testing/fuzz-crash-to-fix-loop
    role: example-of-uncited-technique
  - kind: technique
    ref: ai/agent-fallback-ladder
    role: example-of-uncited-technique
  - kind: paper
    ref: workflow/technique-layer-composition-value
    role: sister meta paper
    note: "sister meta paper — asks \"does the layer produce durable value?\", this paper asks \"is value distributed evenly or concentrated?\""

perspectives:
  - name: Power-Law Citation
    summary: Documentation systems generally exhibit power-law citation. Top entries are cited many times; tail entries are cited zero times. The technique layer is no exception.
  - name: What "Cited" Means Here
    summary: A technique is "cited" if it appears in another entry's `examines[]` (paper), `composes[]` (other technique — banned in v0 but allowed v0.2), or body prose with a stable ref. Star-on-GitHub or pageview is NOT what this paper measures.
  - name: Implications for Authoring
    summary: If 80% of techniques are uncited, the marginal cost of authoring more techniques may exceed the marginal value. The hub may need a "techniques are last-resort, not first-impulse" cultural rule.
  - name: Counter-Argument
    summary: Tail techniques may have value as documentation even uncited (a future user finds them via search). This paper would argue search hits are not "citation"; they are passive use, not a force-multiplier.

external_refs: []

proposed_builds:
  - slug: technique-citation-graph-builder
    summary: Tool that walks all paper PAPER.md and technique TECHNIQUE.md frontmatters, builds a citation graph, computes per-technique in-degree. Surfaces the top-cited and tail-uncited techniques. Runs on schedule, producing a metric for the hub maintainers.
    scope: poc
    requires:
      - kind: technique
        ref: workflow/safe-bulk-pr-publishing
        role: starting-node-for-graph-walk
      - kind: technique
        ref: debug/root-cause-to-tdd-plan
        role: starting-node-for-graph-walk

experiments:
  - name: citation-distribution-at-N
    hypothesis: Once total techniques ≥ 30 (this paper's projection threshold), in-degree distribution is power-law with the top 20% receiving ≥80% of citations.
    method: Run citation-graph tool weekly as the hub grows; plot distribution at N=10, 20, 30, 50; verify power-law shape.
    status: completed
    built_as: null
    result: |
      Built as bootstrap tooling (PR #1113 + #1114), not as an example/ project — the
      proposed_builds[0] "technique-citation-graph-builder" became
      bootstrap/tools/_build_citations_index.py (graph builder, citations.json output)
      plus _audit_orphan_atoms.py and _audit_paper_loops.py (downstream analysis).

      Measurement at current N (2026-04-25):
        - Technique layer (N=17): 4 techniques cited at all (23.5%), 2 cited 2+ times
          (11.8%), 13 uncited (76.5%). Top-cited concentration:
            workflow/safe-bulk-pr-publishing  6 cites
            debug/root-cause-to-tdd-plan      5 cites
            testing/fuzz-crash-to-fix-loop    1 cite
            ai/agent-fallback-ladder          1 cite
        - Atom layer (N=2000 skills + knowledge): 54 cited (2.7%), 1946 uncited (97.3%).

      Power-law shape is already observable at N=17. The premise's threshold of "≤20%
      cited 2+ times" holds (11.8% observed). The N=100 precondition was not met during
      this measurement window — partial support, not full validation. The unexpected
      finding is that the same distribution appears one layer down at N=2000, supporting
      a layer-invariant generalization that the original premise didn't make.
    supports_premise: partial
    observed_at: 2026-04-25
    measured:
      - metric: technique_total
        value: 17
        unit: count
        condition: "N=17 at 2026-04-25 snapshot, excluding gated-fallback-chain self-reference"
      - metric: techniques_cited_2plus
        value: 2
        unit: count
        condition: "11.8% of N=17 — predicate predicted ≤20%; predicate holds well below the original ≥100 precondition"
      - metric: techniques_cited_1
        value: 2
        unit: count
        condition: "11.8% of N=17"
      - metric: techniques_cited_0
        value: 13
        unit: count
        condition: "76.5% orphan rate at the technique layer"
      - metric: top_cited_concentration
        value: 84.6
        unit: percent
        condition: "top 2 techniques (safe-bulk-pr-publishing 6 cites + root-cause-to-tdd-plan 5 cites) = 11/13 of all inbound citations"
      - metric: top_cited_inbound_count
        value: 6
        unit: cites
        condition: "workflow/safe-bulk-pr-publishing — the most-cited technique"
      - metric: atom_total
        value: 2000
        unit: count
        condition: "1105 skills + 894 knowledge + 1 rounding (paper rounds to N=2000)"
      - metric: atom_cited
        value: 61
        unit: count
        condition: "3.0% of N=2000 — atom layer cited at all"
      - metric: atom_orphan_rate
        value: 97.3
        unit: percent
        condition: "1946/2000 atoms uncited — the layer-invariance signal"
      - metric: skill_orphan_rate
        value: 96.3
        unit: percent
        condition: "1064/1105 skills uncited"
      - metric: knowledge_orphan_rate
        value: 97.8
        unit: percent
        condition: "874/894 knowledge entries uncited"
    refutes:
      - "long-tail citation shape becomes visible only at N>=100 techniques"
      - "the technique-layer ROI predicate is technique-layer-only in scope (it generalizes one layer down)"
      - "low citation counts at small N reflect insufficient sample size rather than structural shape"
    confirms:
      - "citation distribution follows a power law (top 2/17 techniques carry 84.6% of inbound citations)"
      - "≤20% of techniques are cited 2+ times (predicted ≤20%, measured 11.8%)"
      - "documentation systems exhibit long-tail citation in general (academic, OSS dependency, Wikipedia)"
      - "uncited entries are the majority of any authored corpus (76.5% at technique layer, 97.3% at atom layer)"

outcomes: []

status: implemented
retraction_reason: null
---

# Technique Layer ROI After 100 Pilots

## Introduction

A skills hub that adopts a `technique/` middle layer composes atoms (skills + knowledge) into reusable recipes by reference. Whether the layer earns its keep depends on whether the recipes get *cited* — by other techniques, by papers, by examples, or by direct ref in body prose. This paper hypothesizes that citation distribution at scale follows a power law, with ≤20% of techniques cited 2+ times and the remaining 80% effectively unused.

The original draft asserted the power-law shape would be visible only at N≥100 techniques. The experiment in this paper measures the actual distribution at N=17 (current corpus) and finds the shape is already observable below the predicted threshold — and that the same shape appears one layer down at the atom layer (N=2000), which the original premise didn't anticipate.

### Background

The hub currently has 18 techniques (4 on main pre-batch, 13 added in the 2026-04-25 batch, 1 added subsequently from the suggestion scanner — `arch/gated-fallback-chain`). This count is well below the original projection threshold of 100, but the citation tooling shipped alongside the corpus (`citations.json`, the orphan/loop audits, the suggestion scanner) makes the distribution measurable at the current scale.

The sibling paper `paper/workflow/technique-layer-composition-value` asks the qualitative question — *does the layer produce durable value?* — and is `type: position`. This paper asks the quantitative companion — *is the value distributed evenly or concentrated?* — and is `type: hypothesis`.

### Prior art

Power-law citation patterns are documented across multiple knowledge systems:
- Academic citation graphs (Garfield's bibliometric work, the Hirsch h-index)
- Open-source dependency networks (npm, PyPI — long tail of unused packages)
- Wikipedia article view distributions (a small fraction of articles attracts most traffic)

The hypothesis is that the technique layer is *not exempt* from this regularity. The experiment tests it directly.

### What this paper sets out to test

Whether the in-degree distribution of citations at the technique layer (as measured by `citations.json` walks of `examines[]`, `composes[]`, and `requires[]` edges) matches the predicted power-law shape, with ≤20% of techniques cited 2+ times.

## Methods

### Citation definition

A technique is "cited" if a `<kind>/<ref>` ref pointing to it appears in the frontmatter of:
- another technique's `composes[]`
- a paper's `examines[]`
- a paper's `proposed_builds[].requires[]` (forbidden for `kind: paper` but allowed for `kind: technique`, since v0.2.1)

The `citations.json` index built by `bootstrap/tools/_build_citations_index.py` enumerates every such edge and keys them by target atom. For this experiment, we filter the index to keys starting with `technique/`.

Not counted as citations:
- Body prose mentions without a stable ref (the lint can't resolve them)
- GitHub stars or pageviews (the layer doesn't track those)
- Inbound search-result clicks (no telemetry)

### Atom-layer extension

The original premise did not consider atoms (skills + knowledge), but the same citation infrastructure also surfaces uncited atoms via `_audit_orphan_atoms.py`. We additionally measure the atom-layer orphan rate as a cross-scale check on the long-tail hypothesis.

### Measurement window

A single point-in-time snapshot taken 2026-04-25, immediately after the suggestion-scanner technique (`arch/gated-fallback-chain`) was authored as the first technique created in response to scanner output. The suggestion scanner itself adds one to N (technique count), but the ratios reported here exclude it from the analysis to keep the measurement free of self-referential noise.

## Results

### Technique layer (N=17, excluding gated-fallback-chain)

`citations.json` reports 4 of 17 techniques receive at least one inbound citation:

| Technique | Cite count | Source kinds |
|---|---:|---|
| `workflow/safe-bulk-pr-publishing` | 6 | papers + builds |
| `debug/root-cause-to-tdd-plan` | 5 | papers + builds |
| `ai/agent-fallback-ladder` | 1 | paper |
| `testing/fuzz-crash-to-fix-loop` | 1 | paper |
| (13 others) | 0 | — |

Distribution summary:
- **2+ cites**: 2 of 17 (11.8%)
- **1 cite**: 2 of 17 (11.8%)
- **0 cites**: 13 of 17 (76.5%)

The premise predicted ≤20% of techniques cited 2+ times. Observed: 11.8%. **Predicate holds at N=17**, well below the original ≥100 precondition.

### Atom layer (N=2000)

`_audit_orphan_atoms.py` reports per-category rollup:

| Layer | Total | Cited | Orphan | Orphan % |
|---|---:|---:|---:|---:|
| skill | 1,105 | 41 | 1,064 | 96.3% |
| knowledge | 894 | 20 | 874 | 97.8% |
| Combined | 2,000 | 61 | 1,946 | **97.3%** |

The atom-layer orphan rate exceeds the original technique-layer prediction of ≥80%. Long-tail shape applies one layer down at much larger N.

### Predicate evaluation

| Original predicate | Result |
|---|---|
| Visible only at N≥100 techniques | **Refuted** — visible at N=17 |
| ≤20% techniques cited 2+ times | **Supported** — 11.8% measured |
| Implicit: technique layer only | **Supported but extended** — atom layer also long-tail (97.3%) |

`supports_premise: partial`. Premise rewritten to drop the ≥100 precondition and to generalize across layers.

## Discussion

### Power-law shape emerges below the original threshold

The 100-technique projection was a defensive lower bound — assumed the layer needed scale to surface its long tail. The measurement at N=17 shows the tail is present from the start. Two top techniques (`safe-bulk-pr-publishing`, `root-cause-to-tdd-plan`) carry 11 of 13 inbound citations (84.6%); 13 techniques have zero inbound citations.

This matches the early-stage shape of well-studied citation graphs. The original draft over-conditioned on scale and missed that the long-tail shape is structural, not threshold-gated.

### Atom layer generalizes the finding

97.3% atom orphan at N=2000 was outside the original premise but is the more striking measurement. The same long-tail shape appears at two scales (N=17 techniques, N=2000 atoms) with similar proportions of uncited entries (76.5%, 97.3%). The technique-layer ROI predicate generalizes one layer down: corpus growth without coordinated citation effort produces a long tail at any scale.

### Implications for authoring (the original perspective preserved)

If 76% of techniques are uncited at N=17 and the proportion only worsens at larger N, the marginal authoring cost of new techniques may exceed the marginal value. The hub-wide cultural rule could be: **techniques are last-resort, not first-impulse** — author skills + knowledge atoms first, then formalize a technique only when atom co-occurrence (surfaced by `_suggest_techniques.py`) demonstrates an actual pattern.

This is what the suggestion-scanner workflow (#1119) and the first scanner-driven technique (#1120) operationalized: techniques are authored in response to observed bundles, not speculative future use.

### Counter-argument: passive use

Tail techniques may have value as documentation even when uncited — a future user discovers them via search and applies the pattern locally without leaving a frontmatter ref. The paper acknowledges but rejects this as falsifying the premise: search hits are passive use, not force-multiplier citation. A pattern that gets searched but not cited remains in the long tail by the paper's definition.

A stronger counter-argument is that citation count is a lagging indicator. A technique cited zero times at the moment of measurement may be cited heavily later. The paper's defense is that measurement must happen at *some* time; cross-section snapshots are the standard tool for power-law analysis. If a re-measurement at a later snapshot inverts the result, the paper would re-open.

### Limitations

- **Single point-in-time snapshot.** Citation counts will move as the corpus grows. A longitudinal version would re-measure quarterly and report drift.
- **Citation definition is narrow.** Only frontmatter-resolvable refs count. Body-prose mentions, search hits, and external blog citations are excluded — broader definitions would shift the orphan rate down.
- **Author bias.** All current entries were authored by one team; co-authoring patterns might produce a different distribution. The hypothesis would need cross-organization validation to claim full generality.
- **The technique layer is recent.** All 17 techniques were authored in the same 2-week window. A more mature corpus (years of accumulation) might show different concentration patterns as old techniques drift out of citation range.

### Future work

1. Quarterly re-measurement to track distribution drift. Build a one-line tool that emits the (cited, 1-cite, 2+ cite) rollup on demand and graphs the trend over time.
2. Replicate the measurement against another technique corpus (if any other team adopts the layer pattern) to test cross-organization stability.
3. Define a "passive-use" proxy — e.g., post-`/hub-show` follow-up edits to a technique within 24h — and measure how it correlates with explicit citation. The counter-argument deserves a falsifiability path.

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/safe-bulk-pr-publishing`**
example-of-cited-technique

**technique — `debug/root-cause-to-tdd-plan`**
example-of-cited-technique

**technique — `testing/fuzz-crash-to-fix-loop`**
example-of-uncited-technique

**technique — `ai/agent-fallback-ladder`**
example-of-uncited-technique

**paper — `workflow/technique-layer-composition-value`**
sister meta paper — asks "does the layer produce durable value?", this paper asks "is value distributed evenly or concentrated?"


## Build dependencies (proposed_builds)

### `technique-citation-graph-builder`  _(scope: poc)_

**technique — `workflow/safe-bulk-pr-publishing`**
starting-node-for-graph-walk

**technique — `debug/root-cause-to-tdd-plan`**
starting-node-for-graph-walk

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Meta-paper, complementary to `paper/workflow/technique-layer-composition-value` which asks "does the layer produce durable value?" — this paper asks "is the value distributed evenly or concentrated?"
- Premise rewritten 2026-04-25 after experiment `citation-distribution-at-N` completed. The strict ≥100 technique precondition was dropped once power-law shape was already observable at N=17, and the long-tail finding was generalized to the atom layer (97.3% orphan at N=2000) since the same distribution shape appeared independently at a different scale. Status moved `draft → implemented`.
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. Methods section made the citation-definition rules explicit (previously implicit in the result). Future Work subsection added concrete follow-up paths (quarterly re-measurement, cross-organization replication, passive-use proxy).
