---
version: 0.2.0-draft
name: contract-test-staleness-curve
description: "Consumer-driven contract tests: hypothesis 50%+ are stale within 6 months, undermining quorum vote logic"
category: testing
tags: [contract-test, staleness, decay, consumer-driven, hypothesis]
type: hypothesis

premise:
  if: Consumer-driven contract tests are not actively maintained as the consumer codebase evolves
  then: Test relevance decays exponentially with consumer churn. ≥50% of contract tests are stale within 6 months in actively-evolving consumer codebases. Stale tests still vote in quorum decisions but vote on outdated assumptions, undermining the protocol.

examines:
  - kind: skill
    ref: safety/interface-contract-validation
    role: contract-validation-shape
  - kind: skill
    ref: testing/tdd
    role: test-discipline-baseline
  - kind: skill
    ref: workflow/idempotency-data-simulation
    role: replay-safety-pattern
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    role: similar-decay-pattern

perspectives:
  - name: Test as Code Decays Like Code
    summary: Tests that are not maintained drift from the consumer's actual behavior. The drift is invisible until a contract change exposes it. By then the test is voting against a behavior the consumer no longer exhibits.
  - name: Consumer Churn Rate Determines Decay Speed
    summary: Stable consumers (released, low-change) keep tests relevant for years. Active consumers (weekly releases) churn assumptions monthly. Decay is bound by consumer churn.
  - name: Quorum Math Sensitivity
    summary: Quorum vote logic assumes votes are equally informed. Stale votes carry disinformation. At 50% stale, quorum is roughly random with respect to current behavior.
  - name: Mitigation
    summary: Auto-re-verify on consumer release. Pre-merge contract test execution. Periodic test-pruning sweeps. None are universal; each has cost.

external_refs: []

proposed_builds:
  - slug: contract-test-staleness-detector
    summary: Tool that diffs a consumer's contract test against the current consumer behavior; flags drift; suggests prune/refresh. Runs on a schedule, surfaces top-N stalest tests.
    scope: poc
    requires:
      - kind: skill
        ref: safety/interface-contract-validation
        role: contract-shape-to-instrument
      - kind: skill
        ref: testing/tdd
        role: test-execution-discipline

experiments:
  - name: staleness-decay-measurement
    hypothesis: Across 5 production codebases with active contract tests, ≥50% of tests pre-date the consumer's last 6 months of changes. Of the tests that pre-date, ≥30% reference behavior the consumer no longer implements.
    method: Sample 5 codebases; classify each contract test by author-date and behavioral relevance; tabulate.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Contract Test Staleness Curve

## Introduction

(see frontmatter)

### Background

`technique/testing/contract-test-with-consumer-verification` proposes quorum-vote contract tests but assumes votes are informed. This paper questions that assumption.

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

(see frontmatter)

### Limitations

- "Stale" definition is judgment-laden; this paper uses behavioral relevance which is harder to automate
- 5-codebase sample is small; generalization is qualitative
- Doesn't account for organizational discipline differences across teams

<!-- references-section:begin -->
## References (examines)

**skill — `safety/interface-contract-validation`**
contract-validation-shape

**skill — `testing/tdd`**
test-discipline-baseline

**skill — `workflow/idempotency-data-simulation`**
replay-safety-pattern

**knowledge — `pitfall/idempotency-implementation-pitfall`**
similar-decay-pattern


## Build dependencies (proposed_builds)

### `contract-test-staleness-detector`  _(scope: poc)_

**skill — `safety/interface-contract-validation`**
contract-shape-to-instrument

**skill — `testing/tdd`**
test-execution-discipline

<!-- references-section:end -->

## Provenance

- Authored 2026-04-25, batch of 10
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
