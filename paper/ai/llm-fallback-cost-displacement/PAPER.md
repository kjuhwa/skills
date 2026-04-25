---
version: 0.2.0-draft
name: llm-fallback-cost-displacement
description: Do LLM fallback ladders save cost or displace it — into tail latency, schema drift, and silent degradations?
category: ai
tags:
  - llm
  - fallback
  - cost-model
  - tail-latency
  - schema-drift
  - hypothesis

type: hypothesis

premise:
  if: A multi-tier LLM fallback ladder is added to a call pipeline expecting cheaper tiers to absorb most traffic
  then: Token cost drops; p99 rises 2-5x (cascading tiers on tail); schema drift on fallback tiers creates silent failures. Net positive only when primary failure <15% AND consumers validate schema.

examines:
  - kind: skill
    ref: ai/ai-call-with-mock-fallback
    role: the simplest fallback shape
    note: the simplest fallback shape — 2-tier baseline
  - kind: skill
    ref: cli/graceful-version-fallback-tier-order
    role: tier-ordering
    note: the tier-ordering rule that the ladder inherits
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: counter-evidence
    note: counter-evidence — silent fallback as the canonical failure mode
  - kind: knowledge
    ref: pitfall/retry-strategy-implementation-pitfall
    role: counter-evidence
    note: counter-evidence — retry-inside-tier vs fall-through confusion
  - kind: paper
    ref: testing/llm-ci-triage-boundary-conditions
    role: sibling-paper
    note: sibling paper on LLM boundary conditions — same silent-failure family
  - kind: paper
    ref: workflow/parallel-dispatch-breakeven-point
    role: prior-paper
    note: prior paper — analogous cost-displacement shape on a different axis
  - kind: paper
    ref: workflow/technique-layer-composition-value
    role: meta paper on layer ROI
    note: meta paper on layer ROI — anchors the cost-vs-value framing this paper inherits

perspectives:
  - name: Nominal vs Tail Cost
    summary: Token cost is on the mean; latency on the tail. A ladder reduces the mean (cheap tier serves most calls) while multiplying the tail (cascading traversals). User experience is tail-dominated.
  - name: Schema Drift
    summary: Tier 1 returns structured JSON; tier 3 returns plain text. Without schema validation, fallback output poisons consumers assuming consistency. Silent schema drift is LLM-era silent fallback.
  - name: Cost-Budget Trigger
    summary: Without a cost-budget governor, ladders exhaust budget on cascade storms (every call traverses all tiers when primary is rate-limited). Budget is the real breaker; token cost is the wrong metric.
  - name: Failure Rate Threshold
    summary: The premise asserts a 15% primary-failure threshold. Below it, tiers 2/3 activate rarely and the ladder is pure insurance. Above it, cascade storms dominate and the ladder becomes the problem.

external_refs: []

proposed_builds:
  - slug: llm-fallback-latency-cost-dashboard
    summary: Instrumentation dashboard tracking per-tier activation rate, per-tier latency contribution to p50/p95/p99, and schema-validation failure count. Surfaces the mean-vs-tail gap in one view.
    scope: poc
    requires:
      - kind: skill
        ref: ai/ai-call-with-mock-fallback
        role: baseline-call
        note: the baseline call shape the dashboard instruments
      - kind: knowledge
        ref: pitfall/circuit-breaker-implementation-pitfall
        role: informs-which
        note: informs which metrics are indicators of the silent-failure shape
  - slug: llm-fallback-schema-validator-middleware
    summary: Middleware validating every tier's output against a registered schema, rejecting cross-tier drift. Rejection triggers an explicit error instead of silently propagating mismatched payloads.
    scope: poc
    requires:
      - kind: skill
        ref: ai/ai-call-with-mock-fallback
        role: tiered-call
        note: the tiered call shape the middleware wraps
      - kind: knowledge
        ref: pitfall/circuit-breaker-implementation-pitfall
        role: codifies-silent-failure
        note: codifies the silent-failure failure mode the middleware prevents
  - slug: llm-fallback-cost-budget-governor
    summary: Budget governor that short-circuits the ladder when month-to-date cost exceeds a ceiling. Returns explicit "budget exceeded, degraded response" instead of silently cascading into tiers.
    scope: demo
    requires:
      - kind: skill
        ref: cli/graceful-version-fallback-tier-order
        role: tier-ordering
        note: the tier-ordering pattern the governor overrides when budget is exhausted
      - kind: knowledge
        ref: pitfall/retry-strategy-implementation-pitfall
        role: retry-storm
        note: retry-storm behavior is the class of failure the governor catches

experiments:
  - name: ladder-latency-vs-nominal-cost-benchmark
    hypothesis: A 3-tier LLM fallback ladder reduces mean token cost by ≥30% but increases p99 latency by ≥2x vs single-tier baseline, across a 500-call workload at primary failure rates 0-40%
    method: |-
      3-tier harness (Opus → Haiku → cached). Replay 500 calls at primary
      failure rates [0, 5, 15, 30, 40]% via fault injection. Measure per-tier
      activations, token cost, p50/p95/p99. See body §Methods.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Do LLM fallback ladders save cost, or displace it?

## Introduction

**If** a multi-tier LLM fallback ladder is added to a call pipeline expecting cheaper tiers to absorb most traffic, **then** the nominal token cost drops as expected, but two other costs rise:

- **(a) p99 latency increases by 2–5×** because cascading tier traversals happen on the tail of the distribution — failed primary → retry → tier 2 → possible retry → tier 3 serializes multiple round-trips.
- **(b) Schema/quality drift on fallback tiers creates silent downstream failures** — tier 1 returns structured JSON, tier 3 returns text, and downstream consumers that don't validate are quietly poisoned.

Net cost is lower **only** when primary failure rate is < 15 percent AND downstream consumers actually validate tier output schema. Below the first condition, tiers 2/3 are dead weight. Above it, cascade storms dominate. Without the second condition, the ladder is a schema-drift generator dressed as resilience.

### Background

The hub carries the baseline ingredients:

- `skills/ai/ai-call-with-mock-fallback` — the 2-tier fallback shape.
- `skills/cli/graceful-version-fallback-tier-order` — the ordered tier-selection rule, originally for CLI version fallback but directly applicable.
- `knowledge/pitfall/circuit-breaker-implementation-pitfall` — the canonical silent-fallback failure mode. The LLM version is the same shape with different failure surface.
- `knowledge/pitfall/retry-strategy-implementation-pitfall` — retry-within-tier vs fall-through confusion, which compounds latency in ladder scenarios.

A proposed technique `ai/agent-fallback-ladder` composes these atoms into a hierarchical ladder with per-tier circuit state. The technique answers "what is the shape?". This paper answers **"does the shape actually save money?"**

### Prior art

`external_refs[]` is empty. Useful sources to pull in via `/hub-research`:

- Anthropic / OpenAI pricing tables for typical tier deltas (Opus vs Haiku, GPT-4 vs GPT-4-mini)
- Chaos-engineering literature on cascade failures (Netflix Hystrix post-mortems) — the LLM version is the same shape on a new surface
- Academic work on "partial ordering of quality-of-service tiers" (QoS literature from networking)
- Prior empirical studies on multi-provider LLM routing cost tradeoffs, if any exist

## Methods

(planned — see `experiments[0].method` in frontmatter for the full design. This section becomes substantive when `status: implemented` and is checked for length by `_audit_paper_imrad.py` at that point.)

## Results

(pending — experiment status: planned. Run `/hub-paper-experiment-run <slug>` once the experiment completes to populate this section from `experiments[0].result`.)

## Discussion

### 1. Nominal vs Tail Cost

Cost is usually quoted as "mean tokens per call times price." For a ladder, the mean is optimistic — it assumes most calls terminate at the cheap tier, which is exactly what the ladder is designed for on the happy path. The **tail** tells a different story:

```
p50 call: served by tier 1  → 1 tier traversal,  1x latency
p99 call: primary fails, retry fails, tier 2 fails → 3-4 tier traversals, 3-5x latency
```

If the user-facing SLO is latency-based (e.g., 99 percent of responses under 2 s), the ladder may satisfy the mean-cost budget while breaking the latency SLO. This is the first form of cost displacement — cost shifts from "dollars per month" to "tail latency the user notices."

### 2. Schema Drift

A tier 1 model trained to return `{"answer": ..., "reasoning": [...]}` is not contract-bound to the tier 3 model. Tier 3 may return plain text. Without downstream validation:

```python
response = call_with_fallback(prompt)
answer = response["answer"]       # works for tier 1
                                  # raises KeyError for tier 3
```

The exception is loud if the downstream bothers to parse. The **silent** case is worse — the downstream accepts whatever it gets and forwards a malformed payload to yet another consumer. This is the LLM-era manifestation of the `circuit-breaker-implementation-pitfall` — silent fallback poisoning the consumer.

### 3. Cost-Budget Trigger

Token cost is measured per call. Budget is measured per month. A ladder without a budget governor can consume a month of budget in an afternoon during a primary-outage cascade storm — every request traverses all tiers because tier 1 is hard-down. The per-call cost looks fine; the cumulative cost is catastrophic.

The budget must be a first-class circuit-breaker signal, not just a cost ceiling. When exceeded, the ladder should refuse further traversals and return explicit degradation — the pattern the third proposed build prototypes.

### 4. Failure Rate Threshold

The premise asserts a 15 percent primary-failure-rate threshold. The intuition:

- **Below 15 percent**: fallback tiers activate rarely; ladder cost is pure insurance at modest premium.
- **Around 15 percent**: ladder is break-even — savings from primary-tier discounts are offset by cascade-induced latency and secondary token spend.
- **Above 15 percent**: cascade storms dominate — tier 2 becomes the default, tier 3 activates frequently, p99 breaks down.

The 15 percent number is a working estimate. The planned experiment tightens it.

### Proposed builds (rationale)

### `llm-fallback-latency-cost-dashboard` (POC)

Per-tier activation rate, per-tier latency contribution to p50/p95/p99, schema-validation failure count. Makes the mean-vs-tail gap visible in one screen. Without this, adoption of the ladder is based on nominal cost alone and the tail cost is invisible.

### `llm-fallback-schema-validator-middleware` (POC)

Middleware that validates every tier's output against a registered schema. Rejection triggers an explicit error. Prevents the silent-schema-drift failure mode that the `circuit-breaker-implementation-pitfall` warns against in the generic case.

### `llm-fallback-cost-budget-governor` (DEMO)

Budget governor that short-circuits the entire ladder when month-to-date cost exceeds a ceiling. Returns explicit "budget exceeded, degraded response" instead of silently cascading into the next tier during a cascade storm.

### Limitations

- **No measurement yet.** The experiment is planned, not executed. The 15 percent threshold is an estimate.
- **Single provider-family assumption.** The ladder model assumes tiers within one provider (or across providers with similar output schemas). Cross-family ladders (e.g., Anthropic → local Llama) have additional drift dimensions this paper does not address.
- **Ignores caching.** A proper cost model includes a response cache layer in front of the ladder. Cache-hit rate interacts with the ladder in ways the simple premise does not capture.
- **No multi-region effects.** Cross-region tier fallback adds network latency that compounds the tail; this paper treats all tiers as network-equivalent.

### Future work

1. Is the 15 percent primary-failure-rate threshold stable across provider pairings, or is it a function of the price delta between tiers? (Larger delta → ladder tolerates higher failure rates before cost displacement dominates.)
2. Can the schema-validation middleware be implemented **generically** across LLM tiers, or does it need a per-task schema registry? The latter is higher overhead but more correct.
3. Is cost displacement an unconditional red flag, or a legitimate engineering tradeoff in some domains? For a user-facing chat product, tail latency is the killer. For a batch data-enrichment pipeline, tail latency is a non-issue and the ladder is a clean win.

<!-- references-section:begin -->
## References (examines)

**skill — `ai/ai-call-with-mock-fallback`**
the simplest fallback shape — 2-tier baseline

**skill — `cli/graceful-version-fallback-tier-order`**
the tier-ordering rule that the ladder inherits

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
counter-evidence — silent fallback as the canonical failure mode

**knowledge — `pitfall/retry-strategy-implementation-pitfall`**
counter-evidence — retry-inside-tier vs fall-through confusion

**paper — `testing/llm-ci-triage-boundary-conditions`**
sibling paper on LLM boundary conditions — same silent-failure family

**paper — `workflow/parallel-dispatch-breakeven-point`**
prior paper on cost displacement under parallelism — analogous shape on a different axis

**paper — `workflow/technique-layer-composition-value`**
meta paper on layer ROI — anchors the cost-vs-value framing this paper inherits


## Build dependencies (proposed_builds)

### `llm-fallback-latency-cost-dashboard`  _(scope: poc)_

**skill — `ai/ai-call-with-mock-fallback`**
the baseline call shape the dashboard instruments

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
informs which metrics are indicators of the silent-failure shape

### `llm-fallback-schema-validator-middleware`  _(scope: poc)_

**skill — `ai/ai-call-with-mock-fallback`**
the tiered call shape the middleware wraps

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
codifies the silent-failure failure mode the middleware prevents

### `llm-fallback-cost-budget-governor`  _(scope: demo)_

**skill — `cli/graceful-version-fallback-tier-order`**
the tier-ordering pattern the governor overrides when budget is exhausted

**knowledge — `pitfall/retry-strategy-implementation-pitfall`**
retry-storm behavior is the class of failure the governor catches

<!-- references-section:end -->

## Provenance

- Authored: 2026-04-24
- Status: pilot #4 for the `paper/` layer schema v0.2 — **tradeoff paper** (cost vs tail latency vs schema drift), non-self-referential
- Schema doc: `docs/rfc/paper-schema-draft.md`
- Paired technique: `technique/ai/agent-fallback-ladder` (if/when published)
- Sibling papers:
  - `paper/workflow/technique-layer-composition-value` (meta)
  - `paper/workflow/parallel-dispatch-breakeven-point` (implemented)
  - `paper/testing/llm-ci-triage-boundary-conditions` (boundary-conditions)
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
