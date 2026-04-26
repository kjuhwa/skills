---
version: 0.3.0-draft
name: binary-narrowing-log2-probe-bound
description: "Tests whether probe counts on reproduced regressions stay within 1.5× of log2(N) — log-search shape paper."
type: hypothesis
status: draft
category: debug
tags:
  - debug
  - bisect
  - log-search
  - probe-bound
  - non-cost-displacement

premise:
  if: "we measure probe counts on 5+ reproduced regressions across at least 3 of {git, file, config, dependency} domains using the binary-narrowing technique"
  then: "real-world probe counts stay within 1.5× of log2(N) across domains, confirming the technique's bound holds despite inconclusive-probe overhead and coupling"

examines:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "log2(N) shape claim under test; technique authored without measurement"

perspectives:
  - by: technique-author
    view: "log2(N) is the load-bearing claim. Without measurement, the technique stays theoretical — the paper exists to discharge that limitation."
  - by: skeptic
    view: "binary search has overhead — partition logic, sanity probe, inconclusive re-runs. Probe count likely drifts 2-3× over log2(N) at moderate N (16-64), making the bound misleading in practice."
  - by: corpus-curator
    view: "first log-search paper in the corpus (was 0/22 in #1188). Tests whether the author can land a non-cost-displacement hypothesis paper. Worked example of #1188's verdict rule."

experiments:
  - name: probe-count-vs-log2N-multi-domain
    status: planned
    method: "Reproduce 5+ regressions per domain (git, file, config, dependency); apply binary-narrowing per #1187 spec; record actual probe count vs log2(N). Full protocol in body Methods."
    measured: "probe count per regression; ratio of actual to log2(N); breakdown by domain; per-cause inconclusive-probe count"
    result: null
    supports_premise: null
    refutes: "implicit assumption that log2(N) is loose theory — should hold within 1.5× in practice"
    confirms: null

requires:
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "the technique under test"
  - kind: paper
    ref: arch/technique-shape-claim-distribution-survey
    note: "the survey that surfaced this paper opportunity (Finding 4) and motivates non-cost-displacement framing"
---

# Binary-Narrowing Probe-Count Bound: log2(N) on Real Regressions

> Tests whether the log-search shape claim of `technique/debug/binary-narrowing-causal-isolation` (#1187) holds in practice. Direct worked-example of paper #1188's verdict rule: a non-cost-displacement paper authored to interrogate a technique whose actual shape is log-search, not crossover.

## Introduction

The technique `binary-narrowing-causal-isolation` (#1187) claims that one cause out of N enumerated suspect candidates can be isolated in **log2(N) probes** by halving the suspect set per probe. The technique self-flagged this as theoretical — its provenance section says "until measured, log2(N) remains a theoretical claim."

This paper closes that loop. It also serves as a worked example of paper #1188's verdict rule ("don't default to cost-displacement lens when authoring papers"). The paper is deliberately framed around the **log-search** shape, not crossover, not Pareto, not necessity — directly counter-evidence to the template-bias hypothesis that `cost-displacement` is the only authorable shape at the paper-promotion stage.

### Why log-search is the right framing

Three failure modes erode the log2(N) bound in practice:

1. **Inconclusive probes** — when a probe can't rule out either half (e.g. environment instability, dependency not installed, build broke for unrelated reason), the technique requires keeping both halves in the suspect set. Each inconclusive probe costs +1 without halving the search space.
2. **Coupled suspects** — when two suspects A and B both must be active for failure to reproduce, naive partitioning rules out both halves wrongly. The technique requires a coupling-detection probe; it costs +1 without contributing to the bound.
3. **Sanity probe overhead** — every binary-narrowing session starts with a "does the suspect set even reproduce the failure?" probe (technique requirement). Cost: +1.

These three additions push the actual probe count above log2(N). The hypothesis: actual ≤ 1.5× log2(N) — i.e., the overhead is small in practice, and the bound is useful guidance not theoretical handwaving.

## Methods

For each domain in {git bisect, file/module subtraction, config flag flipping, dependency audit}:

1. Reproduce 5+ historical regressions where the original cause is known (post-mortem available).
2. For each regression, enumerate the suspect set N (commits in the bisect range, files in the feature, flags in the config, deps in the lockfile).
3. Apply the technique per #1187 spec:
   - Sanity probe (full set must reproduce)
   - Halving with rule-out per probe
   - Inconclusive probes keep both halves
   - Coupling check before partition
   - Confirm-cause as final probe
4. Record:
   - actual probe count A
   - theoretical bound log2(N)
   - ratio R = A / log2(N)
   - inconclusive-probe count
   - coupling-detection trigger (yes/no)

Compute mean R and stddev across regressions. Hypothesis confirmed if mean R ≤ 1.5 across all domains.

### What this paper is NOT measuring

- **Wall-clock time** — probes vary in execution cost (a git checkout + test cycle vs a config-flag flip). The bound is on PROBE COUNT, not time. Wall-clock is per-domain confounded.
- **Cost displacement** — there is no "crossover" being claimed. log2(N) is unboundedly better than linear N; the paper tests whether the theoretical bound holds, not whether it inverts somewhere. Deliberately non-cost-displacement framing per paper #1188's verdict.
- **Single-cause assumption** — the technique is single-cause; if the regression has multiple independent causes, the technique finds one of them. This paper does not measure multi-cause behavior.

## Results

`status: planned` — no data yet. Result will populate when at least one domain has 5+ reproduced regressions measured.

Expected output table (template):

| Domain | Regressions measured | Mean N | Mean log2(N) | Mean A (actual) | Mean R = A/log2(N) | Inconclusive % |
|---|---:|---:|---:|---:|---:|---:|
| git bisect | TBD | TBD | TBD | TBD | TBD | TBD |
| file/module | TBD | TBD | TBD | TBD | TBD | TBD |
| config flag | TBD | TBD | TBD | TBD | TBD | TBD |
| dependency | TBD | TBD | TBD | TBD | TBD | TBD |

## Discussion

### Why this paper exists in the non-cost-displacement column

Paper #1188 found that 8/22 papers (36%) surface cost-displacement crossover, while only 2/25 techniques (8%) do. The 4.5× gap is hypothesized to come from paper-promotion-stage template-bias — when authoring a paper, the default lens is "what cost-displacement does this support?" rather than "what shape claim does this technique actually make?"

This paper tests the rule by walking the talk. The technique's actual shape is **log-search**. The paper tests **log-search**. No retrofit to crossover. If a future paper-counter survey finds that this paper landed (`status: implemented` with `supports_premise: yes` or `partial`), the bias-correction methodology has at least one worked example.

### What would refute the hypothesis

- Mean ratio R > 2 across any domain → the bound is loose; technique should re-state as O(log N) with constant > 1, or different shape entirely.
- Inconclusive-probe rate > 30% in any domain → the technique's "keep both halves" rule degrades the bound to near-linear in practice.
- Coupling triggered in > 20% of regressions → the technique's single-cause assumption is too restrictive; coupling-detection overhead dominates.

Any of these refutations is informative — they would tighten the technique's anti-conditions or prompt a redesign.

### What partial-support would look like

- Mean R ≤ 1.5 in some domains but not others → the bound is domain-conditional. Update technique to state which domains it applies cleanly to.
- Inconclusive rate is high but mean R still ≤ 1.5 → inconclusive overhead is small in practice (suspect set is mostly conclusive). Surprising finding worth its own knowledge atom.

## Limitations (planned)

- **Reproduction bias** — only counted regressions where the cause is post-mortem-known and the bug can be re-triggered. Open bugs and forgotten bugs are excluded.
- **Sample size N=5 per domain is small** — the 1.5× bound has wide confidence intervals at N=5. The paper may need N=10 per domain for statistical confidence.
- **Single-coder operation** — same author runs the binary-narrowing each time. Probe choices may be biased toward what the author finds easy to test. A second coder running the same regressions could surface inter-rater variance.
- **Synthetic vs live regressions** — historical post-mortems often have polished narratives. Live regressions might have more inconclusive probes than the historical record suggests.

## Provenance

- Authored: 2026-04-26
- Filed against issue #1192 (paper opportunity surfaced by #1188 Finding 4)
- Tests technique `debug/binary-narrowing-causal-isolation` (#1187)
- Worked example of paper #1188's verdict rule — non-cost-displacement framing
- Status `draft` until experiment runs. Experiment plan (probe-count-vs-log2N-multi-domain) is the closure path; once 5+ regressions per domain are measured, status transitions to `reviewed` then `implemented`.
- Sibling paper opportunities (also from #1188 Finding 4): #1189 (feature-flag-killswitch threshold-cliff), #1190 (multi-peer-quorum threshold-cliff), #1191 (backpressure-loop hysteresis), #1193 (contract-test threshold-cliff).
