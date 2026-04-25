---
version: 0.2.0-draft
name: swagger-spec-hardening-size-crossover
description: "At what spec size N does swagger-spec-ai-agent-hardening pay for itself? Measure value-vs-cost crossover."
category: workflow
tags:
  - swagger
  - openapi
  - springdoc
  - ai-agent
  - scaling-curve
  - hypothesis
  - cost-benefit

type: hypothesis

premise:
  if: A team applies swagger-spec-ai-agent-hardening to a Spring Boot springdoc project as endpoint count N grows
  then: Cumulative cost (6 phases) exceeds value below N≈30; per-endpoint gain dominates above N≈100. 30-100 grey zone needs measurement; cost shifts from setup (small N) to bulk-annotation (large N).

examines:
  - kind: technique
    ref: workflow/swagger-spec-ai-agent-hardening
    role: subject
    note: subject technique whose spec-size threshold claim is interrogated
  - kind: skill
    ref: workflow/swagger-ai-optimization
    role: canonical-pipeline
    note: pipeline phase whose fixed setup cost dominates small specs
  - kind: skill
    ref: workflow/bucket-parallel-java-annotation-dispatch
    role: bulk-scaling
    note: scaling phase whose marginal cost grows with N
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    role: gap-guard
    note: review-checklist phase whose value depends on AI-fill rate
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: prior-paper
    note: prior paper on coordination-cost-displacement at different N

perspectives:
  - name: Cost Model — Fixed vs Marginal
    summary: Phases 0/3/4 (baseline, runtime-enrich, optimize) have fixed setup cost. Phases 1/2/5 (bulk-annotate, externalize, review) scale linearly with N. Crossover — fixed + marginal × N = value × N.
  - name: Value Model — AI-Output Usability
    summary: Per-endpoint value-gain — richer @Schema, stable operationId, populated @ApiResponse. Gain dominates at large N. Below some N, absolute gain is too small to recover fixed setup.
  - name: Crossover Drivers
    summary: Crossover position depends on team annotation discipline, AI-tool consumer demands, and review thoroughness. Higher discipline shifts crossover up; richer consumers shift it down.
  - name: Counter-Argument — Fixed-Cost Amortization
    summary: Technique pays for itself on small specs if team re-runs on each release. Fixed setup amortizes; per-run cost reduces to marginal phases. Single-shot small specs are the only true loss case.

external_refs: []

proposed_builds:
  - slug: spec-size-cost-benchmark
    summary: Measure cumulative phase cost at N∈{10, 30, 50, 100, 300, 800} endpoints. Synthetic Spring Boot project with controlled endpoint count; instrument each phase's wall-clock + token cost.
    scope: poc
    requires:
      - kind: technique
        ref: workflow/swagger-spec-ai-agent-hardening
        role: subject
        note: technique whose phase costs are measured
      - kind: skill
        ref: workflow/bucket-parallel-java-annotation-dispatch
        role: bulk-scaling
        note: scaling phase whose marginal cost is the primary measurement
  - slug: ai-output-usability-benchmark
    summary: Measure downstream LLM tool-caller success rate against pre-vs-post-technique specs at each N level. Success rate is the value proxy.
    scope: poc
    requires:
      - kind: knowledge
        ref: pitfall/ai-guess-mark-and-review-checklist
        role: gap-guard
        note: pitfall whose review-checklist drives the per-endpoint review cost
  - slug: spec-size-decision-table
    summary: Knowledge entry mapping (N × team-discipline × consumer-richness) → recommended technique application strategy. Backed by benchmark data from builds [1] and [2].
    scope: poc
    requires:
      - kind: technique
        ref: workflow/swagger-spec-ai-agent-hardening
        role: subject
        note: technique whose application threshold is tabulated

experiments:
  - name: spec-size-crossover-measurement
    hypothesis: At N=30, technique cost exceeds value-gain by ≥2x. At N=100, value-gain exceeds cost by ≥2x. The 30-100 region shows non-monotonic crossover dependent on team discipline and consumer richness.
    method: |-
      6 N levels × pre/post technique × LLM tool-caller success-rate
      benchmark. Synthetic project with controlled endpoint count.
      Instrument each phase wall-clock + token cost. See body §Methods.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Swagger Spec Hardening Size Crossover

## Introduction

The `workflow/swagger-spec-ai-agent-hardening` technique recommends a 6-phase pipeline (baseline → bulk-annotate → externalize → runtime-enrich → optimize → review) for Spring Boot springdoc projects whose OpenAPI spec will be consumed by AI agents. Its `recipe.anti_conditions` lists "Hand-curated small spec (≤30 endpoints) — bulk-dispatch overhead is unjustified" — a qualitative threshold without measurement.

This paper interrogates the cost-vs-value claim. The premise predicts a measurable crossover region where technique application transitions from net-negative to net-positive, and identifies the dominant cost drivers at each end of the curve.

### Background

The subject technique was authored greenfield against v0.2 schema in #1149. Its `recipe:` block carries a 6-phase assembly_order and 4 anti_conditions including the ≤30-endpoint cutoff. The atom `swagger-ai-optimization` (canonical-pipeline) carries fixed setup cost regardless of N; the atom `bucket-parallel-java-annotation-dispatch` (bulk-scaling) carries marginal cost per file. The atom `ai-guess-mark-and-review-checklist` (gap-guard) carries per-endpoint review cost in the final phase.

The prior paper `workflow/parallel-dispatch-breakeven-point` established a similar shape on a different axis — coordination cost can dominate parallelism gain past a threshold. This paper applies the same lens to spec-hardening cost vs AI-consumer value.

### What this paper sets out to test

Whether the 30-endpoint threshold from the technique's anti_conditions is correct, whether a higher threshold (100) is the actual value-positive boundary, and which phase's cost dominates at each end of the curve.

## Methods

(planned — see `experiments[0].method` for the measurement skeleton)

The experimental harness simulates technique application across 6 spec sizes against two baseline conditions:

- **pre-technique** — raw springdoc-generated spec without any of the 6 phases
- **post-technique** — full 6-phase application

Spec sizes step from N=10 to N=800: `{10, 30, 50, 100, 300, 800}` endpoints. For each (N × variant) cell, the harness measures:

- **Cost**: per-phase wall-clock latency + LLM token cost + reviewer time (gap-guard checklist length)
- **Value**: downstream LLM tool-caller success rate against the resulting spec (binary: tool call succeeds vs returns malformed args)

Total cells: 6 N × 2 variants × phase-instrumented = **12 cells per metric**, deterministic seed.

### Cost decomposition

```
total_cost(N) = fixed_setup_cost
              + marginal_per_endpoint × N
              + review_cost × N × ai_fill_rate(N)
```

Fixed setup is dominated by phases 0/3/4 (baseline restore, runtime customizer wiring, canonical pipeline init). Marginal per-endpoint comes from phases 1/2 (bulk annotation, YAML externalization). Review cost per endpoint is phase 5; `ai_fill_rate(N)` may itself vary with N (more endpoints = more chances for AI to fill gaps).

### Value decomposition

```
value(N) = per_endpoint_value × N - cost(N)
```

Per-endpoint value comes from LLM tool-caller success rate uplift on richer specs. Below some N, the cumulative cost exceeds N × per_endpoint_value.

## Results

(pending — experiment status is `planned`; this paper is in draft state. Will be populated when the benchmark runs and `/hub-paper-experiment-run` closes the loop.)

## Discussion

(pending)

The expected finding shape: a crossover region somewhere between N=30 and N=100 where (cost-vs-value) sign flips. The exact threshold values depend on team annotation discipline (which scales the manual baseline quality) and AI-consumer demands (which scale per-endpoint value gain).

If supported, the paper's outcome would produce:
- a `knowledge/decision/swagger-hardening-spec-size-threshold` entry with measured crossover band
- a body update to `swagger-spec-ai-agent-hardening` replacing the qualitative ≤30 cutoff with a quantitative crossover-band statement
- a generalized `skill/workflow/spec-size-aware-hardening-router` that picks subset-of-phases based on N

If refuted (technique pays off even at N=10, OR fails even at N=800), the paper still produces actionable knowledge — the technique's anti_conditions need replacement.

### Limitations

- 6 N levels is coarse. Crossover characterization may need a finer sweep around N=30-100 once the rough shape is known.
- Synthetic Spring Boot project may not match production endpoint diversity. A second-phase experiment against a real codebase would close that gap.
- "LLM tool-caller success rate" is one value proxy. Other proxies (developer onboarding speed, codegen quality, doc reviewer throughput) might shift the crossover.
- AI fill-rate `ai_fill_rate(N)` is treated as a function of N here, but it might also depend on the source code's annotation density. Confounding.
- Single-shot vs amortized re-run cost — this experiment measures single-shot; the technique's actual cost in a re-run flow is lower (fixed setup amortizes). The crossover under amortization is a separate experiment.

### Future work

1. Run the benchmark against 2-3 real Spring Boot codebases (open-source samples or anonymized production exports) to validate the synthetic scaling.
2. Decompose the crossover by team-discipline level (low / medium / high baseline annotation quality) — does discipline shift the threshold by a constant or by a multiplier?
3. Re-measure with phase-subset variants (e.g., apply only phases 0/4/5 — skip bulk-annotate and externalize). At what N does the subset variant beat the full pipeline?
4. Tie back to `workflow/parallel-dispatch-breakeven-point` — both papers find coordination cost dominates at a threshold. Is the underlying cost-displacement shape generalizable across techniques?

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/swagger-spec-ai-agent-hardening`**
subject technique whose spec-size threshold claim is interrogated

**skill — `workflow/swagger-ai-optimization`**
pipeline phase whose fixed setup cost dominates small specs

**skill — `workflow/bucket-parallel-java-annotation-dispatch`**
scaling phase whose marginal cost grows with N

**knowledge — `pitfall/ai-guess-mark-and-review-checklist`**
review-checklist phase whose value depends on AI-fill rate

**paper — `workflow/parallel-dispatch-breakeven-point`**
prior paper on coordination-cost-displacement at different N


## Build dependencies (proposed_builds)

### `spec-size-cost-benchmark`  _(scope: poc)_

**technique — `workflow/swagger-spec-ai-agent-hardening`**
technique whose phase costs are measured

**skill — `workflow/bucket-parallel-java-annotation-dispatch`**
scaling phase whose marginal cost is the primary measurement

### `ai-output-usability-benchmark`  _(scope: poc)_

**knowledge — `pitfall/ai-guess-mark-and-review-checklist`**
pitfall whose review-checklist drives the per-endpoint review cost

### `spec-size-decision-table`  _(scope: poc)_

**technique — `workflow/swagger-spec-ai-agent-hardening`**
technique whose application threshold is tabulated

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Subject: `paper/from-technique` flow against `technique/workflow/swagger-spec-ai-agent-hardening` (greenfield v0.2 technique authored 2026-04-26 in #1149)
- Status: draft — `experiments[0]` is planned; the paper will move to `status=implemented` once the benchmark runs and `/hub-paper-experiment-run` closes the loop
- Related to `paper/backend/change-stream-lock-contention-scaling-curve` (#1151) and `paper/workflow/parallel-dispatch-breakeven-point` — same coordination-cost-displacement shape on different axes
