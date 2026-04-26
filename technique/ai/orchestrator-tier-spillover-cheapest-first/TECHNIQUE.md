---
version: 0.2.0-draft
name: orchestrator-tier-spillover-cheapest-first
description: "Orchestrator routes tasks to cheapest tier first; spills to next tier on capacity exhaustion or capability miss."
category: ai
tags:
  - orchestrator
  - tiered-routing
  - cost-optimization
  - spillover
  - capability-fallback

composes:
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    version: "*"
    role: scope-bounding
  - kind: knowledge
    ref: pitfall/rate-limiter-implementation-pitfall
    version: "*"
    role: capacity-discipline
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-output-guard

recipe:
  one_line: "Tiered worker pool ordered by cost (T1 cheapest, T3 expensive). Orchestrator dispatches to T1 first; on capacity-full or capability-miss, spills to T2; T3 is last resort. Per-tier per-task class capacity tracked."
  preconditions:
    - "Workers organized into ≥2 tiers with explicit cost order"
    - "Cheapest tier capable of majority of task classes (else spillover dominates)"
    - "Capacity per tier observable (slot count, request budget)"
  anti_conditions:
    - "Single-tier worker fleet — no spillover destination"
    - "Cheapest tier rarely capable — spillover is the norm, optimization wasted"
    - "Cost difference < orchestrator overhead — tiering doesn't pay off"
  failure_modes:
    - signal: "T1 capacity bursts; spillover floods T2; cascading saturation"
      atom_ref: "knowledge:pitfall/rate-limiter-implementation-pitfall"
      remediation: "Per-tier rate limit + queue with backpressure; spillover decision considers downstream capacity, not just upstream miss"
    - signal: "Capability check approximate; T1 spills incorrectly to T2 for tasks T1 could have handled"
      atom_ref: "skill:ai/ai-subagent-scope-narrowing"
      remediation: "Capability matrix per (tier, task class) measured empirically; refresh on observed failures"
    - signal: "AI agent invents capability claim T1 doesn't have; orchestrator routes incorrectly"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Capability claims validated against measured success rate; agent-claimed but unmeasured = treated as unknown"
  assembly_order:
    - phase: dispatch-to-cheapest
      uses: scope-bounding
    - phase: capacity-or-capability-check
      uses: capacity-discipline
      branches:
        - condition: "T1 accepts"
          next: complete
        - condition: "T1 full or incapable"
          next: spillover-to-next-tier
    - phase: spillover-to-next-tier
      uses: scope-bounding
    - phase: capability-check-on-spillover
      uses: ai-output-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires per-(tier, task class) capability matrix, not single capability per tier"
---

# Orchestrator Tier Spillover (Cheapest First)

> Tiered worker pool ordered by cost. Dispatch to T1 (cheapest); on capacity-full or capability-miss, spill to T2; T3 is last resort. Per-(tier, task class) capability matrix prevents incorrect spillover.

## When to use
- ≥2 tiers with explicit cost order
- Cheapest tier handles majority
- Capacity observable per tier

## When NOT to use
- Single-tier fleet
- Cheapest rarely capable
- Cost diff < orchestrator overhead

## Glue summary
| Added element | Where |
|---|---|
| Per-tier rate limit + queue (anti-cascade) | Spillover gate |
| Empirical (tier × task class) capability matrix | Routing |
| Validate-before-route on agent capability claims | Routing |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
