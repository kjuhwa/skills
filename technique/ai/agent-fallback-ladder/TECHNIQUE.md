---
version: 0.1.0-draft
name: agent-fallback-ladder
description: "Hierarchical fallback ladder for LLM calls: per-tier circuit state, strict tier order, pitfalls guarded at entry"
category: ai
tags:
  - fallback
  - circuit-breaker
  - ladder
  - resilience
  - llm
  - cost-tier

composes:
  - kind: skill
    ref: ai/ai-call-with-mock-fallback
    version: "*"
    role: primary-call-shape
  - kind: skill
    ref: cli/graceful-version-fallback-tier-order
    version: "*"
    role: tier-ordering-rule
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    version: "*"
    role: circuit-state-guard
  - kind: knowledge
    ref: pitfall/retry-strategy-implementation-pitfall
    version: "*"
    role: retry-pitfall-guard

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "each tier has its own circuit state and can be bypassed without affecting later tiers"
  - cmd: "./verify.sh"
---

# Agent Fallback Ladder with Per-Tier Circuit Break

> Pilot #1 was a linear pipeline, #2 a decision tree, #3 an event-driven loop. This pilot is a **hierarchical fallback ladder** — N tiers ordered by cost and confidence, each tier gated by its own circuit-breaker state. A request flows down the ladder until one tier answers; a failure opens that tier's breaker and the next request skips it automatically.

## When to use

- Multiple LLM providers (or model tiers within one provider) with different cost/latency/reliability profiles
- Tasks where a cheaper model often suffices but a stronger one must be available on demand
- Systems that need **graceful degradation**, not outright failure, when a provider rate-limits or has an outage
- Cost-sensitive pipelines where the expected common-case cost should be the cheapest tier

## When NOT to use

- Single-provider deployments (no ladder, no decision)
- Tasks where model output schema varies across tiers in incompatible ways — a fallback tier that cannot produce the required schema is worse than a failed call
- Latency-critical user-facing paths where ladder traversal time is unacceptable (use pre-computed tier selection instead)
- Security-sensitive calls where the weakest tier does not meet the required guarantees

## Ladder cycle (one request)

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│   incoming call                                                   │
│        │                                                          │
│        ▼                                                          │
│   tier 1 (strongest / most expensive)                             │
│        │  circuit: CLOSED ──── skill: ai/ai-call-with-mock-       │
│        │                              fallback (primary shape)    │
│        │  on success → return                                     │
│        │  on failure → open breaker, fall through                 │
│        │  circuit: OPEN ────── skip to tier 2 until half-open     │
│        ▼                                                          │
│   tier 2 (mid-cost fallback)                                      │
│        │  same pattern — independent circuit state                │
│        ▼                                                          │
│   tier 3 (cheap / mock / cached)                                  │
│        │  same pattern                                            │
│        ▼                                                          │
│   exhausted → controlled failure (NOT silent) ─── knowledge:      │
│                                                   circuit-breaker │
│                                                   -implementation-│
│                                                   pitfall         │
└───────────────────────────────────────────────────────────────────┘

Tier order is fixed per skill: cli/graceful-version-fallback-tier-order
Retry inside a tier follows knowledge: retry-strategy-implementation-pitfall
```

## Glue summary (net value added by this technique)

The composed atoms each do their own job. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Independent circuit state per tier (opening tier 1 does NOT open tier 2) | Each tier boundary |
| Fixed tier order at configuration time (no per-request reordering) | Init |
| Exhausted-ladder controlled failure (surface the failure; do not fall through to silent mock) | End of ladder |
| Half-open probing schedule per tier (one probe every T minutes, not cumulative) | Circuit state machine |
| Response-shape validation at each tier boundary (reject tier output that does not match primary schema) | After each tier return |

The atoms describe **one primary call + one fallback path**. The ladder extends that to N tiers with state isolation and an explicit schema guard that atoms do not individually enforce.

## Why "hierarchical" matters

A single "primary + one fallback" pair is a 2-tier special case of this ladder. Scaling to N tiers introduces failure modes that don't exist at N=2:

- **Cascading circuit-open states** if tiers share state (all tiers open simultaneously on a shared timeout) — the isolation rule above blocks this
- **Response-shape drift** — tier 1 returns structured JSON, tier 3 returns plain text. Without a schema guard, downstream callers get silent inconsistency. See knowledge `circuit-breaker-implementation-pitfall` for the class of failure
- **Retry-within-tier confusion** — retrying at tier 1 is different from falling through to tier 2. See knowledge `retry-strategy-implementation-pitfall`

This technique is the **coordination layer** that keeps those failure modes visible.

## Exhausted-ladder policy

When all tiers are OPEN (or all have failed the current request), the ladder must NOT fall through to a default/silent success. Options:

1. **Return explicit error** — caller sees "all tiers unavailable" and decides (retry queue? abort task? manual intervention?)
2. **Return cached response** — only if upstream contract permits staleness, and only if the cache is fresh enough per that contract
3. **Degrade the task** — substitute a lower-functionality code path; MUST be announced to the caller so downstream logic branches correctly

The forbidden policy is **silent success with mock output** — that is exactly the failure mode `circuit-breaker-implementation-pitfall` warns against.

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/ai/ai-call-with-mock-fallback/SKILL.md" \
  "skills/cli/graceful-version-fallback-tier-order/SKILL.md" \
  "knowledge/pitfall/circuit-breaker-implementation-pitfall.md" \
  "knowledge/pitfall/retry-strategy-implementation-pitfall.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- Uses a `cli/graceful-version-fallback-tier-order` skill as tier-ordering rule — the skill was authored for CLI version fallback, but the tier-order abstraction transfers cleanly. Cross-domain reuse is a feature of the `composes[]` pattern; the skill itself need not be renamed
- Circuit half-open probing interval is a free parameter (default 60 s) — per-provider calibration needed
- Schema-guard implementation is left to the operator — this technique specifies the requirement, not the exact validator
- Does not address **cost-based tier skipping** (e.g., skip tier 1 pre-emptively when month-to-date cost exceeds budget). A sibling technique could add that on top
- Assumes tiers are ordered by preference at config time; dynamic reordering based on recent performance is out of scope — see the adjacent paper `ai/llm-fallback-cost-displacement` for why this matters

## Provenance

- Authored: 2026-04-24
- Status: pilot #4 for the `technique/` schema v0.1 — **hierarchical fallback ladder** shape (complementary to pilot #1 linear pipeline, #2 decision tree, #3 event-driven loop)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Paired paper: `paper/ai/llm-fallback-cost-displacement` (examines whether this shape actually saves cost or displaces it)
