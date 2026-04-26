---
version: 0.3.0-draft
name: test-isolation-bisect-log-search-bound
description: "Tests whether binary-narrowing on test isolation holds log2(N) bound — log-search variant paper, completes cluster."
type: hypothesis
status: draft
category: testing
tags:
  - test-isolation
  - log-search
  - bisect
  - non-cost-displacement
  - cluster-completion

premise:
  if: "we measure probe counts on 5+ test isolation regressions (test A breaks because test B leaves bad state) using binary-narrowing per technique #1187"
  then: "probe count stays within 1.5× of log2(N) where N is suspect test count — log-search bound generalizes to test isolation domain"

examines:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "the technique whose log2(N) bound this paper tests in test-isolation domain"
  - kind: paper
    ref: debug/binary-narrowing-log2-probe-bound
    note: "sibling log-search #1 — general bound (existence)"
  - kind: paper
    ref: debug/dependency-bisect-log-search-bound
    note: "sibling log-search #2 — dep domain (calibration)"

perspectives:
  - by: technique-author
    view: "test isolation has explicit selector tooling (pytest --deselect, jest patterns) making per-probe execution cheap. Paper tests whether this lowers actual probe count vs predicted."
  - by: skeptic
    view: "test order matters AND test isolation has hidden coupling (shared fixtures, DB state). Predict: probe count exceeds 2× log2(N) due to coupling; technique's coupling-detection probe fires often."
  - by: corpus-curator
    view: "third log-search paper — completes cluster as 8TH STABLE 3-paper cluster. Sub-questions: existence (#1194) + calibration (#1215) + variant (this paper). All 8 categories now stable."

experiments:
  - name: test-isolation-probe-count-vs-log2N
    status: planned
    method: "5+ test-isolation regressions across 3+ runners. Per regression: enumerate suspects N, run binary-narrowing per #1187, record probe count + coupling triggers. Full protocol in body."
    measured: "actual probe count per regression; ratio actual/log2(N); coupling-trigger frequency; per-runner breakdown (pytest, jest, junit)"
    result: null
    supports_premise: null
    refutes: "implicit assumption that log-search bound holds for test isolation despite hidden coupling"
    confirms: null

requires:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "the technique under test"
  - kind: paper
    ref: debug/binary-narrowing-log2-probe-bound
    note: "first log-search paper — pairs to complete cluster"
  - kind: paper
    ref: debug/dependency-bisect-log-search-bound
    note: "second log-search paper — pairs to complete cluster (3 → stable)"
---

# Test-Isolation Bisect Log-Search Bound

> Tests whether binary-narrowing's log2(N) probe-count bound holds when applied to test isolation regressions (test A breaks because test B leaves bad state). **Third log-search-shape paper** — completes the log-search cluster as the **8TH STABLE 3-PAPER CLUSTER**.

## Introduction

Test isolation regressions are a recurring debug class: a test passes alone but fails when run with other tests. The cause is hidden coupling — shared fixtures, leaked DB state, polluted globals. Bisecting which test pollutes the suite traditionally takes log2(N) probes via test-runner selector flags (`pytest --deselect`, `jest --testPathIgnorePatterns`).

This paper measures whether the log-search bound holds in this domain — same framework as #1194 (general) and #1215 (dependency), now applied to test isolation.

### Log-search cluster sub-question triad COMPLETE

| Paper | Sub-question | Domain |
|---|---|---|
| #1194 binary-narrowing-log2-probe-bound | **Existence** (general log2 bound) | git, file, config, dependency (mixed) |
| #1215 dependency-bisect-log-search-bound | **Calibration** (domain-specific bound) | Dependency conflicts |
| **this paper** | **Variant** (test runner selector domain) | Test isolation |

Per #1205's verdict ("cluster saturates at N=3 covering existence + calibration + variant"), this triad makes log-search the **8th stable 3-paper cluster**.

### Why this completes the corpus shape coverage

Before this PR, log-search was the last forming-cluster (1 → 2 papers). With this paper landed:

| Cluster maturity | Categories | Count |
|---|---|---:|
| **Stable (3 papers)** | threshold-cliff, necessity, Pareto, self-improvement, universality, convergence, hysteresis, **log-search (this PR)** | **8** |
| Forming (2 papers) | (none) | 0 |
| Single | (none) | 0 |

**All 8 distinct shape categories surfaced by paper #1188's census now have stable 3-paper clusters.** Bias-correction methodology has demonstrated saturation across every category in the corpus.

### Why log-search (NOT cost-displacement)

Cost-displacement framing for this question would have been:

> "as test count N grows, bisect cost grows but linear-scan cost grows faster; crossover at optimal N"

Wrong shape. The actual claim:
- log2(N) probes isolate the polluting test (with coupling-overhead margin)
- linear scan = N probes (always worse past small N)
- No crossover — log2 unboundedly better

Per #1188's verdict rule, deliberately framed around the actual shape.

### Why test-isolation domain matters

Test isolation has high coupling probability (shared DB, fixtures). If log-search bound holds despite this, the technique's coupling-detection probe is doing real work — providing empirical anchor for the technique's anti-condition handling.

If bound fails, technique should warn that test-isolation is a degraded use case and operators should expect 2-3× log2(N).

## Methods

For each of 5+ historical test-isolation regressions across 3+ test runners (pytest, jest, junit):

1. **Reproduce regression** — run failing test alone (passes), run failing test with full suite (fails)
2. **Enumerate suspect tests N** — count of tests that ran before the failing test
3. **Apply binary-narrowing per #1187 spec**:
   - Sanity probe (full suspect set must reproduce failure)
   - Halving with rule-out per probe (deselect half, re-run, observe)
   - Inconclusive probes keep both halves
   - Coupling-detection probe before partition
4. **Record**:
   - Actual probe count A
   - Theoretical bound log2(N)
   - Ratio R = A / log2(N)
   - Coupling-trigger count

Hypothesis confirmed if **mean R ≤ 1.5** across 3+ runners.

### What this paper is NOT measuring

- **Cost displacement** — no smooth trade-off; log-search bound test
- **Multi-pollution regressions** — single polluter per regression. Multi-test pollution out of scope
- **Test-runner-specific flag overhead** — assumes selector flag has constant per-call cost
- **Cross-runner generalization in detail** — high-level breakdown only

## Results

`status: planned` — no data yet. Result populates when at least one runner has 5+ measurements.

Expected output table (template):

| Runner | Regressions | Mean N | Mean log2(N) | Mean A | Mean R | Coupling % |
|---|---:|---:|---:|---:|---:|---:|
| pytest | TBD | TBD | TBD | TBD | TBD | TBD |
| jest | TBD | TBD | TBD | TBD | TBD | TBD |
| junit | TBD | TBD | TBD | TBD | TBD | TBD |

## Discussion

### What this paper completes (8th stable cluster — corpus shape coverage saturated)

If hypothesis lands (mean R ≤ 1.5 across runners):
- Third log-search paper covering variant sub-question
- Log-search reaches stable 3-paper cluster status — **8th stable cluster**
- **All 8 distinct shape categories now stable** — corpus reaches structural saturation
- Practical operator rule: test-isolation bisect can use log2(N) as iteration budget

### Why corpus saturation matters

Paper #1188 surfaced 8 distinct shape categories. Paper #1205 hypothesized cluster saturation at N=3 papers per category. This paper closes the last category.

If all 8 reach stable 3-paper cluster, the corpus has empirical confirmation that:
- The 8-category taxonomy is complete (no other shapes needed)
- Bias-correction methodology generalizes across all surfaced shapes
- N=3 saturation point holds universally (not just for some categories)

### What would refute the hypothesis

- Mean R > 2 in any runner → coupling overhead dominates; test isolation is structurally hard for log-search
- Coupling-trigger frequency > 50% → test domain has too much hidden coupling; binary partition assumption mostly fails
- Per-runner mean R varies > 3× → no universal test-bisect rule; runner-specific bounds needed

### What partial-support would look like

- Mean R ≤ 1.5 for pytest + jest but > 2 for junit → runner-conditional; technique should warn JVM ecosystem differs
- Mean R ≤ 1.5 only when isolation features used (e.g., pytest fixtures) → test framework discipline matters

## Limitations (planned)

- **5+ regressions per runner is small** — ideal is 20+
- **Historical regressions only** — selection bias toward well-documented incidents
- **3 runners is partial** — go test, rspec, mocha all have distinct behavior
- **Synthetic reproduction** — checkout-based may not exactly match original test-order conditions
- **No multi-language coverage** — runner-language coupling unmeasured

## Provenance

- Authored: 2026-04-26 (post-#1216 hysteresis cluster completion)
- Tests technique `debug/binary-narrowing-causal-isolation` (#1187) in test-isolation domain
- Worked example #21 of paper #1188's verdict rule — log-search variant framing
- **Third and final log-search-shape paper** — completes the log-search cluster as the **8TH STABLE 3-PAPER CLUSTER**
- **CORPUS SHAPE COVERAGE SATURATED**: all 8 distinct shape categories surfaced by #1188's census now have stable 3-paper clusters
- Status `draft` until experiment runs. Closure path: 5+ regressions × 3+ runners
- Sibling paper opportunity: log-search universality across #1194/#1215/this PR — would extend universality cluster to 4 papers (past N=3 saturation, distinct sub-question would be needed)
