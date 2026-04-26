---
version: 0.3.0-draft
name: technique-shape-claim-distribution-survey
description: "Census of 25 hub techniques by shape claim — template-bias lives in paper authoring, not technique authoring."
type: survey
status: implemented
category: arch
tags:
  - survey
  - shape-claim
  - template-bias
  - corpus-census
  - cross-layer-comparison

premise:
  if: "we classify each of 25 v0.2 techniques into one of 8 shape-claim buckets (cost-displacement, log-search, threshold-cliff, hysteresis, convergence, necessity, invariant, structural)"
  then: "the distribution shows whether the technique layer is template-biased toward any one shape, complementing #1157 which audited the paper layer for the same question"

verdict:
  one_line: "Cost-displacement is rare in techniques (8%) but common in papers (36%) — template-bias enters at paper-promotion, not technique-authoring. Don't default to crossover lens when authoring papers."
  rule:
    when: "authoring a paper that interrogates an existing technique"
    do: "do NOT default to cost-displacement framing — check the technique's actual shape claim first; promote that shape to the paper, not the cost-displacement lens"
    threshold: "if technique surfaces a non-cost-displacement shape (necessity, log-search, threshold-cliff, hysteresis, convergence), the paper should test THAT shape, not retrofit cost-displacement"
  belief_revision:
    before: "the recurrent cost-displacement shape across papers reflects corpus discovery — many real systems share this trade-off"
    after: "the recurrence is partly authoring template applied at paper-promotion time. Techniques themselves are shape-diverse; papers are shape-homogeneous. Bias enters at promotion."

applicability:
  domain: "any layered knowledge corpus where a lower layer (techniques) is promoted to a higher layer (papers) by the same authors"
  precondition: "lower layer has shape-claim distribution; higher layer can be checked for shape-homogeneity"
  out_of_scope: "single-layer corpora; corpora where layers have disjoint authorship"

premise_history:
  - revised_at: 2026-04-26
    from: "the technique layer should mirror the paper layer's cost-displacement dominance"
    to: "the technique layer is shape-diverse; cost-displacement dominance is paper-layer-specific"
    reason: "direct count: 2/25 techniques surface cost-displacement vs 8/22 papers — 8% vs 36%, a 4.5× ratio gap"

examines:
  - kind: technique
    ref: ai/agent-fallback-ladder
    note: "shape: cost-displacement (tiered)"
  - kind: technique
    ref: ai/multi-agent-fan-out-with-isolation
    note: "shape: structural-only"
  - kind: technique
    ref: ai/swagger-spec-selective-two-pass-loading
    note: "shape: cost-displacement crossover"
  - kind: technique
    ref: arch/feature-flag-killswitch-with-circuit-state
    note: "shape: threshold-cliff"
  - kind: technique
    ref: arch/finite-state-machine-monotonic-ratchet
    note: "shape: necessity (monotonic)"
  - kind: technique
    ref: arch/gated-fallback-chain
    note: "shape: invariant-only"
  - kind: technique
    ref: arch/idempotent-mutation-with-rollback
    note: "shape: invariant-only"
  - kind: technique
    ref: arch/multi-peer-quorum-decision-loop
    note: "shape: threshold-cliff (quorum)"
  - kind: technique
    ref: arch/saga-with-compensation-chain
    note: "shape: invariant-only"
  - kind: technique
    ref: arch/strangler-fig-traffic-shifting
    note: "shape: necessity (monotonic ratchet)"
  - kind: technique
    ref: backend/change-stream-resilient-consumer
    note: "shape: structural-only"
  - kind: technique
    ref: data/producer-consumer-backpressure-loop
    note: "shape: hysteresis (high-water/low-water)"
  - kind: technique
    ref: db/idempotent-migration-with-resume-checkpoint
    note: "shape: invariant-only"
  - kind: technique
    ref: debug/binary-narrowing-causal-isolation
    note: "shape: log-search (log2(N))"
  - kind: technique
    ref: debug/root-cause-to-tdd-plan
    note: "shape: structural-only"
  - kind: technique
    ref: devops/canary-rollout-with-auto-revert
    note: "shape: necessity (staged ramp)"
  - kind: technique
    ref: frontend/figma-driven-ai-react-design-system
    note: "shape: structural-only"
  - kind: technique
    ref: frontend/optimistic-mutation-with-server-reconcile
    note: "shape: invariant-only"
  - kind: technique
    ref: security/credential-rotation-overlap-window
    note: "shape: necessity (overlap window)"
  - kind: technique
    ref: testing/contract-test-with-consumer-verification
    note: "shape: threshold-cliff (quorum vote)"
  - kind: technique
    ref: testing/fuzz-crash-to-fix-loop
    note: "shape: convergence (corpus-toward-coverage)"
  - kind: technique
    ref: workflow/fan-out-fan-in-with-bulkhead
    note: "shape: structural-only"
  - kind: technique
    ref: workflow/safe-bulk-pr-publishing
    note: "shape: structural-only"
  - kind: technique
    ref: workflow/soft-convention-4pr-cascade
    note: "shape: necessity (sequence)"
  - kind: technique
    ref: workflow/swagger-spec-ai-agent-hardening
    note: "shape: structural-only"

perspectives:
  - by: technique-author
    view: "the shape-claim was an authoring choice — most techniques describe a pattern without committing to a cost claim. Under-claiming preserves usefulness when the claim would be hard to defend."
  - by: paper-author
    view: "papers exist to surface measurable claims; cost-displacement is natural because crossover thresholds are testable. Authoring a paper around an invariant-only technique is harder."
  - by: corpus-curator
    view: "the gap (techniques diverse, papers homogeneous) is itself a signal — the promotion path funnels shape diversity into a single mold. Counter-action: invite papers testing non-crossover shapes."

experiments:
  - name: technique-shape-census
    status: completed
    method: "Read all 25 v0.2 TECHNIQUE.md files. Extract recipe.one_line + body. Classify primary shape claim into one of 8 buckets. Tally distribution."
    measured: "shape-claim count per bucket; ratio of quantitative vs qualitative vs no-claim"
    result: "8/25 quantitative (cost-displacement 2, threshold-cliff 3, log-search 1, hysteresis 1, convergence 1); 5/25 necessity; 12/25 no-claim. Full table in body Discussion."
    supports_premise: yes
    observed_at: 2026-04-26
    refutes: "implicit assumption that technique layer mirrors paper layer's shape distribution"
    confirms: "shape-claim distribution is layer-specific; techniques are diverse, papers are homogeneous"
  - name: paper-vs-technique-comparison
    status: completed
    method: "Compare technique-shape census (this paper) against survey #1157's paper census."
    measured: "ratio of cost-displacement papers to cost-displacement techniques"
    result: "Papers 8/22 (36%); techniques 2/25 (8%). Ratio gap 4.5× — papers over-represent cost-displacement vs same-author techniques."
    supports_premise: yes
    observed_at: 2026-04-26
    refutes: "cost-displacement frequency is uniform across hub layers"
    confirms: "promotion-stage bias hypothesis — techniques get reframed as cost-displacement when authored as papers"

outcomes:
  - kind: produced_technique
    ref: debug/binary-narrowing-causal-isolation
    note: "deliberate non-cost-displacement counter-shape (log2 search) — confirms author CAN produce diverse shapes; bias is at paper-promotion, not technique-authoring"

requires:
  - kind: paper
    ref: arch/cost-displacement-shape-cross-paper-survey
    note: "the prior survey of paper-layer shape distribution that this paper complements and partially refutes"
---

# Technique Shape-Claim Distribution Survey

> Survey of all 25 v0.2 techniques in `kjuhwa/skills-hub` for their primary shape claim. Direct empirical complement to `paper/arch/cost-displacement-shape-cross-paper-survey` (#1157), which surveyed the paper layer for the same question. The two layers turn out to look very different — and the gap is the finding.

## Introduction

Survey #1157 audited 22 papers and found that 8 of them (36%) explicitly surface a cost-displacement crossover shape — a notable concentration. It hypothesized that the recurrence might reflect either (a) genuine corpus discovery (many real systems share this trade-off) or (b) authoring template-bias by a single dominant author. It noted that more counter-evidence (deliberately-non-cost-displacement contributions) would help discriminate between the two.

This paper extends the question to the technique layer: do techniques show the same cost-displacement concentration?

## Method

For each of the 25 v0.2 techniques in `~/.claude/skills-hub/remote/technique/`:

1. Read `recipe.one_line` from frontmatter and the body's "shape claim" or "glue summary" section.
2. Classify the **primary** shape claim into one of 8 buckets (defined below).
3. Tally counts; compare against survey #1157's paper-layer census.

### Classification buckets

| Bucket | Defining feature |
|---|---|
| **Cost-displacement crossover** | Explicit trade-off: cost grows with X but value displaces past threshold |
| **Log search** | Cost scales as log(N) for some search-space size N |
| **Threshold-cliff** | Discontinuous behavior — binary state past a threshold |
| **Hysteresis** | Two thresholds with gap (high-water / low-water) preventing oscillation |
| **Convergence** | Iterative process narrowing toward a fixed point |
| **Necessity** | Sequence or invariant required; out-of-order or violation breaks |
| **Invariant-only** | A property must hold (idempotency, atomicity); no cost-shape claim |
| **Structural-only** | A composition pattern; no cost or invariant claim surfaced |

The first 5 buckets are **quantitative** (testable shape claim); buckets 6 is **qualitative** (testable but not numeric); buckets 7-8 are **no-claim** (pattern descriptions only).

## Results

### Distribution across 25 techniques

```
cost-displacement crossover : ██ 2  (8%)
log-search                  : █ 1  (4%)
threshold-cliff             : ███ 3  (12%)
hysteresis                  : █ 1  (4%)
convergence                 : █ 1  (4%)
necessity                   : █████ 5  (20%)
invariant-only              : █████ 5  (20%)
structural-only             : ███████ 7  (28%)
```

Quantitative shapes:  8/25 (32%)
Qualitative claims:   5/25 (20%)
No-claim patterns:   12/25 (48%)

### Per-technique classification (full audit)

| Technique | Bucket |
|---|---|
| `ai/agent-fallback-ladder` | cost-displacement (tiered) |
| `ai/multi-agent-fan-out-with-isolation` | structural-only |
| `ai/swagger-spec-selective-two-pass-loading` | cost-displacement crossover |
| `arch/feature-flag-killswitch-with-circuit-state` | threshold-cliff |
| `arch/finite-state-machine-monotonic-ratchet` | necessity (monotonic) |
| `arch/gated-fallback-chain` | invariant-only |
| `arch/idempotent-mutation-with-rollback` | invariant-only |
| `arch/multi-peer-quorum-decision-loop` | threshold-cliff (quorum) |
| `arch/saga-with-compensation-chain` | invariant-only |
| `arch/strangler-fig-traffic-shifting` | necessity (monotonic ratchet) |
| `backend/change-stream-resilient-consumer` | structural-only |
| `data/producer-consumer-backpressure-loop` | hysteresis |
| `db/idempotent-migration-with-resume-checkpoint` | invariant-only |
| `debug/binary-narrowing-causal-isolation` | log-search |
| `debug/root-cause-to-tdd-plan` | structural-only |
| `devops/canary-rollout-with-auto-revert` | necessity (staged ramp) |
| `frontend/figma-driven-ai-react-design-system` | structural-only |
| `frontend/optimistic-mutation-with-server-reconcile` | invariant-only |
| `security/credential-rotation-overlap-window` | necessity (overlap window) |
| `testing/contract-test-with-consumer-verification` | threshold-cliff (quorum vote) |
| `testing/fuzz-crash-to-fix-loop` | convergence |
| `workflow/fan-out-fan-in-with-bulkhead` | structural-only |
| `workflow/safe-bulk-pr-publishing` | structural-only |
| `workflow/soft-convention-4pr-cascade` | necessity (sequence) |
| `workflow/swagger-spec-ai-agent-hardening` | structural-only |

### Cross-layer comparison

| Shape | Paper layer (#1157) | Technique layer (this paper) | Ratio |
|---|---:|---:|---:|
| Cost-displacement crossover | 8 / 22 (36%) | 2 / 25 (8%) | **4.5×** more common in papers |
| Necessity | 2 / 22 (9%) | 5 / 25 (20%) | 2.2× more common in techniques |
| Threshold-cliff | 0 / 22 (0%) | 3 / 25 (12%) | technique-only |
| Log-search | 0 / 22 (0%) | 1 / 25 (4%) | technique-only |
| Hysteresis | 0 / 22 (0%) | 1 / 25 (4%) | technique-only |
| Pareto distribution | 1 / 22 (5%) | 0 / 25 (0%) | paper-only |

The two layers have **substantially different shape distributions**.

## Discussion

### Finding 1 — technique-layer cost-displacement is RARE

Only 2 of 25 techniques (8%) surface a cost-displacement crossover. Compare to 8 of 22 papers (36%) — a 4.5× concentration in the paper layer. The hypothesis from #1157 that "cost-displacement is the dominant shape" is true for papers but **not for techniques**.

### Finding 2 — promotion-stage bias hypothesis

Same author, same hub, same authoring window. The only difference is the layer. If the bias were author-level, it would appear at both layers. It does not. Therefore the bias is **layer-specific**: it enters when a technique is promoted to a paper, not when the technique is authored.

A plausible mechanism: papers exist to surface measurable claims. The author, when promoting a technique to a paper, defaults to "what cost-displacement claim does this support?" rather than "what shape claim does this technique actually make?" The cost-displacement lens is convenient — it has a clear hypothesis structure (cost grows here, value displaces there, crossover at threshold) — and gets applied as a template.

### Finding 3 — the technique layer is shape-diverse

48% of techniques surface no quantitative claim at all (invariant-only or structural-only). 20% surface a necessity claim (qualitative). Only 32% surface a quantitative shape — and within that 32%, no single shape dominates. The technique layer is genuinely diverse.

### Finding 4 — shapes that exist in techniques but not in papers

Threshold-cliff (3 techniques), log-search (1), and hysteresis (1) all appear in the technique layer with **zero corresponding papers**. These are shape-claims that have not been promoted. Three opportunities for measurable papers exist on existing techniques without changing anything:

| Technique | Untested shape claim |
|---|---|
| `arch/feature-flag-killswitch-with-circuit-state` | threshold-cliff: error rate trip point |
| `arch/multi-peer-quorum-decision-loop` | threshold-cliff: quorum off-by-one math |
| `data/producer-consumer-backpressure-loop` | hysteresis: high-water / low-water gap calibration |
| `debug/binary-narrowing-causal-isolation` | log-search: log2(N) probe count on real regressions |
| `testing/contract-test-with-consumer-verification` | threshold-cliff: ≥2/3 quorum vote |

## Verdict (non-redundant — see frontmatter for the canonical one_line)

The hub has a layer-specific authoring template. Papers default to cost-displacement framing; techniques don't. When the author next promotes a technique to a paper, they should ask: **"what shape does this technique actually claim?"** before defaulting to "where does cost displace value?"

## Implications for the corpus

1. The verdict has an actionable rule: when authoring a paper, check the technique's actual shape first. Don't reframe.
2. There are 5 immediate non-cost-displacement paper opportunities on existing techniques (Finding 4). Filing these as issues would make the bias-correction concrete rather than aspirational.
3. The 4.5× ratio gap could be re-measured periodically as more techniques and papers are added. If the gap narrows, the bias correction is working. If it stays, the template-bias is structural.

## Limitations

- **Single-coder classification** — I (the same author who wrote most of the techniques and papers) classified each technique. Inter-rater reliability is unmeasured. A second coder could reclassify and surface bucket disagreements.
- **8-bucket taxonomy is coarse** — some techniques surface multiple shape claims (e.g. backpressure-loop has hysteresis as primary AND structural elements). Primary-claim coding hides these mixtures.
- **N is small** — 25 techniques, 22 papers. The 4.5× ratio is striking but not statistically powerful.
- **Authorship is concentrated** — single dominant author. A multi-author corpus might show different layer-specific distributions or none at all. Bias diagnosis depends on this confound.
- **Survey is itself a paper** — and it is NOT a cost-displacement paper. So my act of writing this paper is itself counter-evidence to the bias hypothesis at the paper-authoring stage. (Or evidence that I can recognize the bias and resist it once it's named.)

## Provenance

- Authored: 2026-04-26
- Direct empirical complement to `paper/arch/cost-displacement-shape-cross-paper-survey` (#1157, paper-layer census)
- Survey type — no experiment cycle needed; the act of authoring IS the survey
- Prior counter-evidence contributions to the bias question:
  - `paper/workflow/soft-convention-phase-ordering-necessity` (#1160) — necessity shape paper
  - `paper/workflow/safe-bulk-pr-anchor-phase-necessity` (#1174) — necessity shape paper
  - `paper/workflow/ai-swagger-gap-fill-confidence-distribution` (#1176) — Pareto shape paper
  - `technique/debug/binary-narrowing-causal-isolation` (#1187) — log-search shape technique
  - This paper — cross-layer comparison
- Filed follow-up issues for the 5 untested shape opportunities surfaced in Finding 4 — see issue tracker for `paper-opportunity-untested-technique-shape` label
