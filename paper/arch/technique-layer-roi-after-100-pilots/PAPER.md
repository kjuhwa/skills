---
version: 0.2.0-draft
name: technique-layer-roi-after-100-pilots
description: "Technique-layer ROI: after 100 techniques, what fraction get cited 2+ times? Hypothesis: long tail with 80% under-cited"
category: arch
tags: [technique-layer, roi, citation-pattern, long-tail, hypothesis]
type: hypothesis

premise:
  if: A skills hub accumulates ≥100 techniques over time
  then: Citation distribution follows a power law. ≤20% of techniques get cited 2+ times by other content (papers, examples, downstream techniques). The remaining 80% are written, indexed, and effectively unused — the long tail of the technique layer's ROI.

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
    role: sister meta paper — asks "does the layer produce durable value?", this paper asks "is value distributed evenly or concentrated?"

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
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Technique Layer ROI After 100 Pilots

## Premise

(see frontmatter)

## Background

The hub currently has ≈17 techniques (4 on main, 13 in drafts). This paper extrapolates to N=100 and predicts the citation distribution. Either confirms the layer earns its keep (top techniques carry the value) or surfaces the empty-loop retraction risk in concrete terms.

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
