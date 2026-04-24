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
  then: The nominal token cost drops as expected, but two other costs rise — (a) p99 latency increases by 2-5x because cascading tier traversals happen on the tail, and (b) schema/quality drift on fallback tiers creates silent downstream failures — such that NET cost is lower only when the primary tier's failure rate is < 15 percent AND downstream consumers actually validate tier output schema. Below/above those conditions, the ladder displaces cost rather than saves it.

examines:
  - kind: skill
    ref: ai/ai-call-with-mock-fallback
    role: the simplest fallback shape — 2-tier baseline
  - kind: skill
    ref: cli/graceful-version-fallback-tier-order
    role: the tier-ordering rule that the ladder inherits
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: counter-evidence — silent fallback as the canonical failure mode
  - kind: knowledge
    ref: pitfall/retry-strategy-implementation-pitfall
    role: counter-evidence — retry-inside-tier vs fall-through confusion

perspectives:
  - name: Nominal vs Tail Cost
    summary: Token cost is measured on the mean call; latency cost is measured on the tail. A ladder can reduce the mean (cheap tier serves most requests) while multiplying the tail (failed primary → retry → tier 2 → possible retry → tier 3). User-facing experience is dominated by the tail.
  - name: Schema Drift
    summary: Tier 1 returns structured JSON; tier 3 returns plain text. Without downstream schema validation, the fallback-produced output poisons consumers that assume consistency. Silent schema drift is the LLM-era equivalent of the circuit-breaker silent fallback.
  - name: Cost-Budget Trigger
    summary: A ladder without a cost-budget governor can exhaust budget on cascade storms (every request goes through all tiers because primary is rate-limited). The budget is the real circuit-breaker; token cost alone is the wrong metric.
  - name: Failure Rate Threshold
    summary: The premise asserts a 15 percent primary-failure-rate threshold. Below that, tiers 2/3 activate rarely and the ladder is pure insurance. Above that, cascade storms dominate and the ladder becomes the problem.

external_refs: []

proposed_builds:
  - slug: llm-fallback-latency-cost-dashboard
    summary: Instrumentation dashboard tracking per-tier activation rate, per-tier latency contribution to p50/p95/p99, and schema-validation failure count. Surfaces the mean-vs-tail gap in one view.
    scope: poc
    requires:
      - kind: skill
        ref: ai/ai-call-with-mock-fallback
        role: the baseline call shape the dashboard instruments
      - kind: knowledge
        ref: pitfall/circuit-breaker-implementation-pitfall
        role: informs which metrics are indicators of the silent-failure shape
  - slug: llm-fallback-schema-validator-middleware
    summary: Middleware that validates every tier's output against a registered schema and rejects cross-tier drift. Rejection triggers an explicit error rather than silently propagating the mismatched payload downstream.
    scope: poc
    requires:
      - kind: skill
        ref: ai/ai-call-with-mock-fallback
        role: the tiered call shape the middleware wraps
      - kind: knowledge
        ref: pitfall/circuit-breaker-implementation-pitfall
        role: codifies the silent-failure failure mode the middleware prevents
  - slug: llm-fallback-cost-budget-governor
    summary: Budget governor that short-circuits the ladder entirely when month-to-date cost exceeds a configurable ceiling. When activated, returns explicit "budget exceeded, degraded response" rather than silently spending into the next tier.
    scope: demo
    requires:
      - kind: skill
        ref: cli/graceful-version-fallback-tier-order
        role: the tier-ordering pattern the governor overrides when budget is exhausted
      - kind: knowledge
        ref: pitfall/retry-strategy-implementation-pitfall
        role: retry-storm behavior is the class of failure the governor catches

experiments:
  - name: ladder-latency-vs-nominal-cost-benchmark
    hypothesis: A 3-tier LLM fallback ladder reduces mean token cost by ≥ 30 percent but increases p99 latency by ≥ 2x vs a single-tier baseline, across a representative workload of 500 calls where primary failure rate ranges 0-40 percent
    method: |
      Construct a test harness with 3 LLM tiers (Claude-Opus → Claude-Haiku →
      cached-response). Replay a representative workload of N = 500 calls with
      primary failure rate varied across [0, 5, 15, 30, 40] percent (injected
      via fault-injection proxy). Measure per-tier activation count, per-call
      token cost, p50/p95/p99 latency. Compute mean token cost delta and p99
      latency delta vs single-tier baseline for each failure-rate bucket.
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

## Premise

**If** a multi-tier LLM fallback ladder is added to a call pipeline expecting cheaper tiers to absorb most traffic, **then** the nominal token cost drops as expected, but two other costs rise:

- **(a) p99 latency increases by 2–5×** because cascading tier traversals happen on the tail of the distribution — failed primary → retry → tier 2 → possible retry → tier 3 serializes multiple round-trips.
- **(b) Schema/quality drift on fallback tiers creates silent downstream failures** — tier 1 returns structured JSON, tier 3 returns text, and downstream consumers that don't validate are quietly poisoned.

Net cost is lower **only** when primary failure rate is < 15 percent AND downstream consumers actually validate tier output schema. Below the first condition, tiers 2/3 are dead weight. Above it, cascade storms dominate. Without the second condition, the ladder is a schema-drift generator dressed as resilience.

## Background

The hub carries the baseline ingredients:

- `skills/ai/ai-call-with-mock-fallback` — the 2-tier fallback shape.
- `skills/cli/graceful-version-fallback-tier-order` — the ordered tier-selection rule, originally for CLI version fallback but directly applicable.
- `knowledge/pitfall/circuit-breaker-implementation-pitfall` — the canonical silent-fallback failure mode. The LLM version is the same shape with different failure surface.
- `knowledge/pitfall/retry-strategy-implementation-pitfall` — retry-within-tier vs fall-through confusion, which compounds latency in ladder scenarios.

A proposed technique `ai/agent-fallback-ladder` composes these atoms into a hierarchical ladder with per-tier circuit state. The technique answers "what is the shape?". This paper answers **"does the shape actually save money?"**

## Perspectives

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

## External Context

`external_refs[]` is empty. Useful sources to pull in via `/hub-research`:

- Anthropic / OpenAI pricing tables for typical tier deltas (Opus vs Haiku, GPT-4 vs GPT-4-mini)
- Chaos-engineering literature on cascade failures (Netflix Hystrix post-mortems) — the LLM version is the same shape on a new surface
- Academic work on "partial ordering of quality-of-service tiers" (QoS literature from networking)
- Prior empirical studies on multi-provider LLM routing cost tradeoffs, if any exist

## Proposed Builds

### `llm-fallback-latency-cost-dashboard` (POC)

Per-tier activation rate, per-tier latency contribution to p50/p95/p99, schema-validation failure count. Makes the mean-vs-tail gap visible in one screen. Without this, adoption of the ladder is based on nominal cost alone and the tail cost is invisible.

### `llm-fallback-schema-validator-middleware` (POC)

Middleware that validates every tier's output against a registered schema. Rejection triggers an explicit error. Prevents the silent-schema-drift failure mode that the `circuit-breaker-implementation-pitfall` warns against in the generic case.

### `llm-fallback-cost-budget-governor` (DEMO)

Budget governor that short-circuits the entire ladder when month-to-date cost exceeds a ceiling. Returns explicit "budget exceeded, degraded response" instead of silently cascading into the next tier during a cascade storm.

## Open Questions

1. Is the 15 percent primary-failure-rate threshold stable across provider pairings, or is it a function of the price delta between tiers? (Larger delta → ladder tolerates higher failure rates before cost displacement dominates.)
2. Can the schema-validation middleware be implemented **generically** across LLM tiers, or does it need a per-task schema registry? The latter is higher overhead but more correct.
3. Is cost displacement an unconditional red flag, or a legitimate engineering tradeoff in some domains? For a user-facing chat product, tail latency is the killer. For a batch data-enrichment pipeline, tail latency is a non-issue and the ladder is a clean win.

## Limitations

- **No measurement yet.** The experiment is planned, not executed. The 15 percent threshold is an estimate.
- **Single provider-family assumption.** The ladder model assumes tiers within one provider (or across providers with similar output schemas). Cross-family ladders (e.g., Anthropic → local Llama) have additional drift dimensions this paper does not address.
- **Ignores caching.** A proper cost model includes a response cache layer in front of the ladder. Cache-hit rate interacts with the ladder in ways the simple premise does not capture.
- **No multi-region effects.** Cross-region tier fallback adds network latency that compounds the tail; this paper treats all tiers as network-equivalent.

## Provenance

- Authored: 2026-04-24
- Status: pilot #4 for the `paper/` layer schema v0.2 — **tradeoff paper** (cost vs tail latency vs schema drift), non-self-referential
- Schema doc: `docs/rfc/paper-schema-draft.md`
- Paired technique: `technique/ai/agent-fallback-ladder` (if/when published)
- Sibling papers:
  - `paper/workflow/technique-layer-composition-value` (meta)
  - `paper/workflow/parallel-dispatch-breakeven-point` (implemented)
  - `paper/testing/llm-ci-triage-boundary-conditions` (boundary-conditions)
