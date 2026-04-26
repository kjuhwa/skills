---
version: 0.2.0-draft
name: cost-displacement-shape-cross-paper-survey
description: "Survey of 4 hypothesis papers converging on the same cost-displacement shape across domains — does the shape generalize?"
category: arch
tags:
  - survey
  - cost-displacement
  - layer-invariance
  - cross-paper
  - corpus-meta

type: survey

premise:
  if: A skills-hub authors multiple hypothesis papers interrogating different techniques across distinct domains
  then: Papers converge on shared cost-displacement shape (saturation past workload-conditional threshold) regardless of domain. Corpus surfaces layer-invariance candidate without coordination.

examines:
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: anchor-closed-loop
    note: first closed-loop in corpus; partial refute produced the shape instance
  - kind: paper
    ref: backend/change-stream-lock-contention-scaling-curve
    role: surveyed-paper
    note: applies the shape to per-event lock contention vs N consumer instances
  - kind: paper
    ref: workflow/swagger-spec-hardening-size-crossover
    role: surveyed-paper
    note: applies the shape to spec-hardening cost vs endpoint count N
  - kind: paper
    ref: frontend/figma-ai-variant-mode-collapse-threshold
    role: surveyed-paper
    note: applies the shape to AI variant exploration vs sub-agent count N
  - kind: paper
    ref: arch/technique-layer-roi-after-100-pilots
    role: orthogonal-prior
    note: orthogonal closed-loop paper; counter-example bounding layer-invariance scope

perspectives:
  - name: Shape Catalog
    summary: All 4 papers predict a workload-conditional crossover where value flips negative past a threshold. Each picks a different threshold variable on a different cost axis.
  - name: Domain Decomposition
    summary: Compute (dispatch, lock), resource (spec), creativity (variant exploration) — all carry the same shape claim. If experiments converge, shape is axis-invariant; if diverge, similarity is misleading.
  - name: Authoring Bias
    summary: Single author wrote all 4 papers in one session. Shape repetition may reflect selection bias rather than corpus-level convergence. Multi-author replication is the only way to disambiguate.
  - name: What This Survey Cannot Conclude
    summary: Only 1 of 4 has measured data; the other 3 are planned. The shape claim is 1 measured + 3 hypothetical. Survey's value is naming the pattern so future papers can be designed to confirm or refute it.

external_refs: []

proposed_builds:
  - slug: cost-displacement-shape-tracker
    summary: Knowledge entry mapping each future hypothesis paper to whether its experiment fits the cost-displacement shape. Updated as papers close loops. Objective layer-invariance compliance metric.
    scope: poc
    requires:
      - kind: paper
        ref: workflow/parallel-dispatch-breakeven-point
        role: anchor-paper
        note: the closed-loop anchor against which future shape-claims are compared

experiments: []

outcomes: []

status: draft
retraction_reason: null
---

# Cost-Displacement Shape — Cross-Paper Survey

## Introduction

Four hypothesis papers in this corpus interrogate distinct techniques across distinct domains, yet all four predict the same shape — value (or correctness, or distinguishability) saturates at a workload-conditional threshold, then degrades past it. This survey enumerates the shape's instances, decomposes the domain axes, and frames the layer-invariance claim that the four-paper convergence suggests.

The survey makes no falsifiable prediction of its own. It is a meta-observation: the corpus is producing the same hypothesis shape repeatedly, and that pattern itself is worth naming.

### Background

The skills-hub corpus has 4 hypothesis papers that share a structural premise:

| Paper | Domain | Threshold variable | Cost axis |
|---|---|---|---|
| `workflow/parallel-dispatch-breakeven-point` | parallel agent dispatch | useful_output count | wasted compute |
| `backend/change-stream-lock-contention-scaling-curve` | per-event distributed lock | N consumer instances | lock acquire latency |
| `workflow/swagger-spec-hardening-size-crossover` | OpenAPI spec hardening pipeline | endpoint count N | cumulative phase cost |
| `frontend/figma-ai-variant-mode-collapse-threshold` | AI variant exploration | N parallel sub-agents | distinguishability + reviewer fatigue |

All four predict **a workload-conditional threshold past which net value turns negative**. The first paper has measured data (partial refute on the original 70%-coverage threshold; rewritten to useful_output absolute count). The other three are planned experiments.

A fifth paper (`arch/technique-layer-roi-after-100-pilots`) is orthogonal — it found a power-law / long-tail shape rather than a saturation/crossover shape. Including it as orthogonal-prior is deliberate: the survey's claim is not "all papers in this corpus converge" but specifically "these four scale-out cost-displacement papers converge."

### What this survey sets out to capture

1. **Shape catalog** — name each instance of the shape and the threshold variable it predicts.
2. **Domain decomposition** — which axes (compute vs creativity vs operational cost) carry the shape.
3. **Authoring-bias acknowledgment** — single author, single session, 4 papers; the convergence may be selection bias.
4. **What the survey can and cannot conclude** — without measured experiments on 3 of 4 papers, the layer-invariance claim is forward-looking.

## Shape catalog

For each surveyed paper, the same fields:

### `parallel-dispatch-breakeven-point` (closed loop)

- **Threshold variable**: useful_output absolute count
- **Original premise**: 70% prior-coverage was the threshold
- **Measured outcome**: `partial`. The 70% number was a single-session observation; rewritten to "useful_output < ~5 files makes parallel dispatch pure waste regardless of coverage fraction"
- **Cost axis**: wasted compute (N agents × startup cost when the work is already done)
- **Direction**: cost dominates below threshold, value dominates above

### `change-stream-lock-contention-scaling-curve` (planned)

- **Threshold variable**: N consumer instances
- **Premise**: lock contention grows superlinearly past N≈8 typical instances
- **Cost axis**: per-event lock acquire latency under contention
- **Direction**: value (coordination) dominates below threshold, cost (contention) dominates above

### `swagger-spec-hardening-size-crossover` (planned)

- **Threshold variable**: endpoint count N
- **Premise**: cumulative cost (6 phases) exceeds value below N≈30; per-endpoint gain dominates above N≈100
- **Cost axis**: cumulative pipeline cost (token + latency + reviewer time)
- **Direction**: cost dominates below threshold, value dominates above (inverted from #1)

### `figma-ai-variant-mode-collapse-threshold` (planned)

- **Threshold variable**: N parallel sub-agents
- **Premise**: distinguishable variant count saturates at N≈4-5; past N≈8 mode collapse produces near-identical outputs
- **Cost axis**: token cost + reviewer fatigue
- **Direction**: value (distinguishability) dominates below threshold, cost (fatigue + collapse) dominates above

## Domain decomposition

The 4 papers span three axis families:

| Axis family | Papers | What's being measured |
|---|---|---|
| Compute coordination | parallel-dispatch, lock-contention | wall-clock + lock acquire under N agents |
| Operational pipeline | spec-hardening | cumulative cost across pipeline phases vs spec size |
| Creativity exploration | variant-mode-collapse | distinguishability + reviewer judgment vs sub-agent count |

The shape claim is identical across all three families. If the experiments converge on similar threshold *shapes* (not necessarily similar threshold *values*), the cost-displacement claim is **axis-invariant within scale-out workloads**. If they diverge — say, the creativity axis shows continuous degradation rather than a saturation knee — the surface similarity is misleading.

## Authoring-bias acknowledgment

A single author wrote all 4 papers in one session (2026-04-26). The convergence on shape may reflect:

- **Genuine corpus-level discovery** — the author noticed the shape in paper #1 and recognized it across other techniques. The shape is real and the corpus is documenting it.
- **Selection bias** — the author looks for cost-displacement everywhere because paper #1 was the first closed-loop. Techniques that don't fit the shape didn't get picked for paper-from-technique.
- **Authoring template** — the author has internalized a paper template (premise → examines technique → propose benchmark → predict crossover) that always produces this shape regardless of underlying domain.

Multi-author replication is the only way to disambiguate. If a second author writes a paper interrogating a technique and predicts a different shape, the bias hypothesis gains support. If they independently arrive at the same shape, the genuine-discovery hypothesis gains support.

## What this survey cannot conclude

- **The shape is not yet validated**. Only 1 of 4 papers has measured data. The other 3 are planned experiments. Layer-invariance requires ≥2 closed-loop confirmations, ideally on different axes.
- **The 70% threshold rewrite in paper #1 is the only data point**. The rewritten claim (useful_output absolute count) is what survived measurement; the original 70% claim was refuted. If the planned experiments rewrite their premises similarly, the shape may be more nuanced than the surface premises suggest.
- **The orthogonal-prior paper** (`technique-layer-roi-after-100-pilots`) shows a long-tail shape, not a crossover. Including it as a counter-example bounds the shape's scope: not all hub papers fit, only the scale-out cost-displacement ones do.
- **No experiment is being proposed in this survey**. It is a naming exercise for a pattern that may or may not generalize.

## Discussion

If the 3 planned experiments converge on the cost-displacement shape:
- The corpus has its first cross-paper generalization.
- The pattern becomes worth elevating to its own atom — `knowledge/decision/cost-displacement-shape-applies-when` — that future technique authors can cite as prior art.
- The next hypothesis paper authored against any new technique would have a baseline expectation: "does this follow the cost-displacement shape, or does it diverge?"

If the experiments diverge:
- The surface similarity was an authoring artifact (selection or template bias).
- The corpus's hypothesis-paper-writing flow may need explicit prompts for shape diversity.
- The survey itself becomes the testimony — it documented the convergence at the time, and the divergence retrospectively shows where the pattern broke.

Either outcome is informative. The survey's value is creating the *artifact* against which future measurement can be compared.

### Limitations

- 4 papers is a small sample. The shape claim has low statistical power even if all 4 close their loops.
- Single-author corpus. Cross-organization replication is required for any claim of "this shape generalizes beyond one team's authoring pattern."
- The "shape" is an informal description — saturation/crossover/threshold. A formal mathematical characterization (e.g., specific functional family) would strengthen the survey.
- Survey papers in this corpus are a new genre. The schema permits `type: survey` (§4 enum) but the lifecycle isn't well-tested. This paper is also a pilot for the survey-paper authoring pattern.

### Future work

1. **Track each planned experiment's outcome**. Update this survey's `## Discussion` after each closes via `/hub-paper-experiment-run`. Use the survey as a living document.
2. **Multi-author replication**. Invite a second author to write a hypothesis paper against a new technique. Compare the shape they predict to the survey's claim.
3. **Counter-example hunt**. Look for hub techniques where a hypothesis paper would NOT predict the cost-displacement shape (e.g., techniques whose value increases monotonically with scale). Authoring such a paper would test whether the bias is template-driven.
4. **Mathematical characterization**. Define "the shape" formally — what functional family (logistic? piecewise-linear?) the curves should fit. Compare measured experiments against the family.

<!-- references-section:begin -->
## References (examines)

**paper — `workflow/parallel-dispatch-breakeven-point`**
corpus's first closed-loop paper; partial refute produced the shape's first instance

**paper — `backend/change-stream-lock-contention-scaling-curve`**
applies the shape to per-event lock contention vs N consumer instances

**paper — `workflow/swagger-spec-hardening-size-crossover`**
applies the shape to spec-hardening cost vs endpoint count N

**paper — `frontend/figma-ai-variant-mode-collapse-threshold`**
applies the shape to AI variant exploration vs sub-agent count N

**paper — `arch/technique-layer-roi-after-100-pilots`**
orthogonal closed-loop paper that found long-tail shape; counter-example for layer-invariance scope


## Build dependencies (proposed_builds)

### `cost-displacement-shape-tracker`  _(scope: poc)_

**paper — `workflow/parallel-dispatch-breakeven-point`**
the closed-loop anchor against which future shape-claims are compared

<!-- references-section:end -->

## Provenance

- Authored 2026-04-26
- Type: survey — first survey paper in the corpus
- Subject: meta-observation across 4 hypothesis papers (workflow/parallel-dispatch-breakeven-point, backend/change-stream-lock-contention-scaling-curve, workflow/swagger-spec-hardening-size-crossover, frontend/figma-ai-variant-mode-collapse-threshold)
- Status: draft — survey papers don't require an experiment to reach `implemented` per §6 rule 10. Whether this paper transitions to `implemented` depends on the corpus's survey-lifecycle convention, which isn't well-tested.
- This is also a pilot for the survey-paper authoring pattern; if the lifecycle works cleanly, future surveys can use this as a template.
