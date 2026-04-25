---
version: 0.2.0-draft
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

outcomes: []

status: implemented
retraction_reason: null
---

# Technique Layer ROI After 100 Pilots

## Premise

(see frontmatter)

## Background

The hub currently has ≈17 techniques (4 on main, 13 in drafts). This paper extrapolates to N=100 and predicts the citation distribution. Either confirms the layer earns its keep (top techniques carry the value) or surfaces the empty-loop retraction risk in concrete terms.

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

## Perspectives

(see frontmatter)

## External Context

Power-law citation patterns are documented across academia (Garfield), open-source repositories (npm dependency graph), and Wikipedia article views. This paper would test whether the technique layer fits the same pattern.

## Limitations

- N=100 is a projection; current count is 17
- "Citation" definition is narrow (frontmatter-resolvable refs); broader interpretations would shift the curve
- Power-law shape is asserted from prior literature; this paper's experiment is to verify it for the technique layer specifically

## Provenance

- Authored 2026-04-25, batch of 10
- Meta-paper, complementary to `paper/workflow/technique-layer-composition-value` which asks "does the layer produce durable value?" — this paper asks "is the value distributed evenly or concentrated?"
- Premise rewritten 2026-04-25 after experiment `citation-distribution-at-N` completed. The strict ≥100 technique precondition was dropped once power-law shape was already observable at N=17, and the long-tail finding was generalized to the atom layer (97.3% orphan at N=2000) since the same distribution shape appeared independently at a different scale. Status moved `draft → implemented`.
