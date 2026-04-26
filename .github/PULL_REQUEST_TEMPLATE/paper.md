<!--
PR template for paper authoring. Bakes in verdict rules from implemented hypothesis papers.
Trigger via `?template=paper.md` in the GitHub PR creation URL.

Verdict rules baked in:
- #1188 (technique-shape-claim-distribution-survey): don't default to cost-displacement framing
- #1200 (author-bias-self-correction-feasibility): track shape-claim adherence per PR
- #1205 (cluster-formation-dynamics-from-bias-correction): cluster saturates at N=3
- #1133 (parallel-dispatch-breakeven-point): pre-flight probe before parallel work
-->

## Summary

<!-- 2-3 sentences describing what this paper claims and why it exists. -->

## Shape category (#1188 verdict rule)

**Primary shape claim** — pick exactly one. **Avoid cost-displacement crossover unless the technique's actual shape is crossover.** Per paper #1188's verdict, cost-displacement is the default-bias to resist.

- [ ] cost-displacement crossover (justified — see "Why cost-displacement" section below)
- [ ] threshold-cliff
- [ ] log-search
- [ ] hysteresis
- [ ] convergence
- [ ] necessity
- [ ] Pareto distribution
- [ ] self-improvement (meta-corpus)
- [ ] cross-domain universality (meta-shape)
- [ ] saturation-without-crossover
- [ ] other (specify): ___

### Why this shape (not cost-displacement)

<!--
Explain why the actual shape claim is what it is, NOT cost-displacement.
If you DID pick cost-displacement, justify why the technique's actual shape is crossover.
Per #1188 verdict: don't retrofit crossover onto a technique whose actual shape is something else.
-->

## Cluster context (#1205 verdict rule)

**Existing papers in this shape category**: ___ <!-- count from `/hub-paper-list --status=draft,reviewed,implemented` filtered by shape -->

- [ ] This is the **1st** paper in the category (single, opens new shape)
- [ ] This is the **2nd** paper (cluster forming, sub-question pair)
- [ ] This is the **3rd** paper (completes 3-paper cluster — covers existence + calibration + variant)
- [ ] This is the **4th+** paper — **REQUIRES distinct sub-question justification** (per #1205 rule: cluster saturates at N=3; 4+ needs novelty)

### Sub-question coverage (if 2nd or 3rd in cluster)

- [ ] **Existence** — does the shape hold at all?
- [ ] **Calibration** — where do we put the parameter?
- [ ] **Variant / scale** — how does it scale across instances/domains?

### Distinct sub-question justification (if 4th+)

<!--
Required if this is paper #4+ in an existing 3-paper cluster.
Articulate WHAT new sub-question this paper covers that the prior 3 didn't.
Without this justification, the paper is corpus padding (#1205 verdict).
-->

## Hypothesis & methods

### Premise

- **if**: <!-- premise.if (≤200 chars per §16) -->
- **then**: <!-- premise.then (≤200 chars) -->

### Methods (planned)

<!-- Brief summary; full protocol in body. Should be measurable + replicable. -->

### Status

- [ ] `draft` — experiment is `planned`
- [ ] `reviewed` — partial measurement
- [ ] `implemented` — experiment closed, supports_premise filled, verdict.* populated

## Adherence tracking (#1200 verdict rule)

Per #1200, single-author bias-correction holds at 100% under per-PR adherence tracking. This section makes the tracking explicit.

- [ ] I checked the technique's actual shape claim BEFORE writing the premise (#1188 rule)
- [ ] I picked the shape from the catalog above, not by default-lens
- [ ] If 4+ in cluster, I justified the distinct sub-question (#1205 rule)
- [ ] My PR description references this paper's position in the bias-correction sequence (worked example #N)

## Cross-references

- Tests technique: <!-- e.g., `technique/<category>/<slug>` -->
- Sibling papers in cluster: <!-- e.g., #N1, #N2 -->
- Worked example: <!-- e.g., #N of paper #1188's verdict rule sequence -->

## Audits

- [ ] IMRaD body structure (Introduction + Methods + Results + Discussion)
- [ ] Frontmatter §16: 0 offenders (≤120 char description, ≤200 char per other field)
- [ ] Strict-YAML: clean (no mid-string `: ` in unquoted scalars)
- [ ] All `examines[]` and `requires[]` refs resolve on disk
- [ ] If status=implemented: v0.3 verdict + applicability + premise_history populated

## Test plan

- [ ] Reviewer confirms shape framing matches technique's actual claim
- [ ] Reviewer confirms cluster-position justification (esp. if 4+ in cluster)
- [ ] All paper audits pass (`/hub-paper-verify <slug>`)

## Follow-ups (not blocking)

<!--
Optional. Sibling paper opportunities, future cluster extensions, etc.
-->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
