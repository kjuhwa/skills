---
version: 0.3.0-draft
name: dependency-bisect-log-search-bound
description: "Tests whether binary-narrowing on dependency conflicts holds log2(N) bound — log-search calibration paper."
type: hypothesis
status: draft
category: debug
tags:
  - debug
  - dependency-bisect
  - log-search
  - calibration
  - non-cost-displacement

premise:
  if: "we measure probe counts on 5+ reproduced dependency conflicts (lockfile regression: dep X breaks when dep Y upgrades), applying binary-narrowing per technique #1187"
  then: "real-world probe counts stay within 1.5× of log2(N) where N is suspect dep count — log-search bound generalizes from commits to dependencies"

examines:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "the technique whose log2(N) bound this paper tests in dep-conflict domain"
  - kind: paper
    ref: debug/binary-narrowing-log2-probe-bound
    note: "sibling log-search paper — general bound (existence sub-question)"

perspectives:
  - by: technique-author
    view: "the technique was authored generically. Dependency conflict is a concrete instance — paper measures whether log2(N) holds when the suspect set is npm/pip/cargo deps, not git commits."
  - by: skeptic
    view: "dep conflicts are coupled — one dep breaks only when another is at certain version. Coupled suspects break partition assumption. Predict: probe count > 2× log2(N) due to coupling overhead."
  - by: corpus-curator
    view: "second log-search paper, joining #1194. Cluster forming (1 → 2). Sub-questions: general bound (#1194) + domain calibration (this paper). 3rd would form 7th stable cluster."

experiments:
  - name: dep-bisect-probe-count-vs-log2N
    status: planned
    method: "5+ historical dep-conflict regressions across 3+ ecosystems (npm/pip/cargo). Per regression: enumerate suspects N, run binary-narrowing per #1187, record probe count + coupling triggers."
    measured: "actual probe count per regression; ratio actual/log2(N); coupling-trigger frequency; per-ecosystem breakdown"
    result: null
    supports_premise: null
    refutes: "implicit assumption that log2(N) bound generalizes from git commits to dependency conflicts without overhead"
    confirms: null

requires:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "the technique under test"
  - kind: paper
    ref: debug/binary-narrowing-log2-probe-bound
    note: "first log-search paper — pairs with this PR to start cluster forming (1 → 2)"
---

# Dependency-Bisect Log-Search Bound

> Tests whether binary-narrowing's log2(N) probe-count bound holds when applied to dependency conflicts (lockfile regression isolation). **Second log-search-shape paper** — joins #1194 (general bound) to start the log-search cluster forming (1 → 2). Eliminates the last single-paper category in the corpus.

## Introduction

The technique `technique/debug/binary-narrowing-causal-isolation` (#1187) claims log2(N) probes isolate one cause out of N candidates. Paper #1194 framed this as a generic claim across {git, file, config, dependency} domains. This paper specializes to **dependencies** as a high-leverage sub-domain.

Dependency conflicts are particularly interesting because they violate one of the technique's anti-conditions — coupling. Two deps can be individually fine but break in combination. Binary partition assumes independence; coupling adds probe overhead.

The hypothesis: even with coupling overhead, probe count stays within 1.5× log2(N) on representative regressions. Tests whether log-search bound generalizes cleanly to dep domain or degrades meaningfully.

### Log-search cluster sub-question pair (forming)

| Paper | Sub-question | Domain |
|---|---|---|
| #1194 binary-narrowing-log2-probe-bound | **Existence** (general log2 bound) | git, file, config, dependency (mixed) |
| **this paper** | **Calibration** (domain-specific bound) | Dependency conflicts only |

A 3rd log-search paper covering variant sub-question would complete the cluster as the **7th stable 3-paper cluster** — natural candidate: file-isolation (`pytest --deselect` style) bound.

### Why log-search (NOT cost-displacement)

Cost-displacement framing for this question would have been:

> "as suspect set N grows, probe cost grows but linear-scan cost grows faster; crossover at optimal N"

Wrong shape. The actual claim:

- log2(N) probes isolate the conflict (with coupling-overhead margin)
- linear scan = N probes (always worse past small N)
- No crossover — log2 unboundedly better than linear at any size

Per #1188's verdict rule, deliberately framed around the actual shape (log-search bound) rather than retrofit cost-displacement.

### Why this matters: eliminates the last single-paper category

Before this PR, log-search was the only single-paper category (1/22 papers). With this paper landed, **all 8 distinct shape categories have ≥2 papers** — corpus reaches a structural milestone where every shape category has at least started cluster formation.

## Methods

For each of 5+ historical dependency-conflict regressions across 3+ ecosystems (npm, pip, cargo):

1. **Reproduce conflict** — checkout known-good lockfile, apply known-broken upgrade
2. **Enumerate suspect set N** — count of deps that changed (or could have caused conflict)
3. **Apply binary-narrowing per #1187 spec**:
   - Sanity probe (full set must reproduce)
   - Halving with rule-out per probe
   - Inconclusive probes keep both halves
   - Coupling-detection probe before partition
   - Confirm-cause as final probe
4. **Record**:
   - Actual probe count A
   - Theoretical bound log2(N)
   - Ratio R = A / log2(N)
   - Coupling-trigger count (how many probes hit coupled-suspect path)
   - Inconclusive-probe count

Compute mean R across regressions. Hypothesis confirmed if **mean R ≤ 1.5** across 3+ ecosystems.

### What this paper is NOT measuring

- **Cost displacement** — no smooth trade-off; log-search bound test
- **Multi-conflict regressions** — single conflict per regression. Multi-conflict (two independent breaks) out of scope
- **Production trace replay** — uses historical post-mortems; live regression bisect comparison would be a follow-up
- **Cross-ecosystem differences in detail** — high-level ecosystem breakdown only; per-ecosystem patterns not deeply analyzed

## Results

`status: planned` — no data yet. Result populates when at least one ecosystem has 5+ measurements.

Expected output table (template):

| Ecosystem | Regressions | Mean N | Mean log2(N) | Mean A | Mean R | Coupling % |
|---|---:|---:|---:|---:|---:|---:|
| npm | TBD | TBD | TBD | TBD | TBD | TBD |
| pip | TBD | TBD | TBD | TBD | TBD | TBD |
| cargo | TBD | TBD | TBD | TBD | TBD | TBD |

## Discussion

### Why this matters for the corpus

If hypothesis lands (mean R ≤ 1.5 across ecosystems):
- Second log-search paper covering calibration sub-question
- Log-search cluster enters forming-cluster regime (1 → 2)
- **All 8 shape categories now have ≥2 papers** — every category has started cluster formation
- Practical operator rule: dep-bisect can use log2(N) as iteration budget

If hypothesis fails (mean R > 2):
- Coupling overhead dominates in dep domain
- Technique's anti-condition (coupled suspects) needs strengthening
- Operators should expect 2-3× log2(N) for dep work, not 1.5×

### What would refute the hypothesis

- Mean R > 2 in any ecosystem → coupling overhead is too high; log-search bound doesn't generalize cleanly to deps
- Coupling-trigger frequency > 50% → dep domain is structurally coupled; binary partition assumption fails majority-of-the-time
- Per-ecosystem mean R varies > 3× → no universal dep-bisect rule; ecosystem-specific bounds needed

### What partial-support would look like

- Mean R ≤ 1.5 for npm + pip but > 2 for cargo → ecosystem-conditional; technique should warn cargo users
- Mean R ≤ 1.5 only when coupling-trigger is rare → bound holds when independence holds; technique should pre-filter coupled cases

## Limitations (planned)

- **5+ regressions per ecosystem is small** — ideal is 20+ for tight CI
- **Historical regressions only** — selection bias (only well-documented conflicts make it to post-mortem)
- **3 ecosystems is partial** — cargo, gradle, go-mod, conan all have distinct dep behavior
- **Synthetic conflict reproduction** — checkout-based reproduction may not exactly match original incident
- **Coupling detection is heuristic** — paper accepts technique's heuristic; doesn't measure heuristic correctness

## Provenance

- Authored: 2026-04-26 (post-#1214 hysteresis cluster start)
- Tests technique `debug/binary-narrowing-causal-isolation` (#1187) in dep-conflict domain
- Worked example #19 of paper #1188's verdict rule — log-search calibration framing
- **Second log-search-shape paper** — joins #1194 to start the log-search cluster forming (1 → 2)
- **Eliminates last single-paper category in corpus** — milestone: all 8 distinct shape categories now have ≥2 papers
- Status `draft` until experiment runs. Closure path: 5+ regressions × 3+ ecosystems
- Sibling paper opportunity: 3rd log-search paper (variant sub-question, e.g., file-isolation bisect bound) → 7th stable cluster
