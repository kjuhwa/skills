---
version: 0.2.0-draft
name: orchestrator-circuit-breaker-per-worker
description: "Per-worker circuit-breaker state machine; orchestrator quarantines failing workers and reroutes load to healthy peers."
category: ai
tags:
  - orchestrator
  - circuit-breaker
  - worker-pool
  - quarantine
  - failover

composes:
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    version: "*"
    role: cb-canonical-pitfall
  - kind: skill
    ref: ai/ai-subagent-scope-narrowing
    version: "*"
    role: scope-isolation
  - kind: skill
    ref: debug/investigate
    version: "*"
    role: failure-diagnosis

recipe:
  one_line: "Each worker carries circuit state (closed/open/half-open). Orchestrator tracks per-worker error rate, trips on threshold, reroutes new load to healthy peers, half-open probe re-arms after cooldown."
  preconditions:
    - "Worker pool has ≥3 workers (single-worker has no failover destination)"
    - "Workers are functionally interchangeable (homogeneous capability per task class)"
    - "Error metrics observable per worker, per task class"
  anti_conditions:
    - "Single-worker setup — no failover destination, breaker accomplishes nothing"
    - "Worker capability is heterogeneous — failover may route to incapable worker"
    - "Error class is global (e.g. upstream API down) — per-worker breaker irrelevant; need global breaker"
  failure_modes:
    - signal: "All workers trip simultaneously; orchestrator has no healthy worker"
      atom_ref: "knowledge:pitfall/circuit-breaker-implementation-pitfall"
      remediation: "Detect global vs per-worker failure; on all-trip, escalate to global circuit + alert; do not loop reroute"
    - signal: "Half-open probe loops forever; worker never re-arms"
      atom_ref: "knowledge:pitfall/circuit-breaker-implementation-pitfall"
      remediation: "Bounded probe attempts; permanent quarantine after N failed half-open cycles + manual unlock"
    - signal: "Worker quarantined while still receiving in-flight work; double-counted failures"
      atom_ref: "skill:debug/investigate"
      remediation: "Drain in-flight work before quarantine; new load goes to healthy peers; in-flight may complete or fail naturally"
  assembly_order:
    - phase: track-per-worker-state
      uses: scope-isolation
    - phase: error-rate-detect
      uses: cb-canonical-pitfall
      branches:
        - condition: "rate above threshold"
          next: trip-and-quarantine
        - condition: "rate normal"
          next: continue
    - phase: trip-and-quarantine
      uses: cb-canonical-pitfall
    - phase: half-open-probe
      uses: failure-diagnosis
      branches:
        - condition: "probe succeeds"
          next: re-arm
        - condition: "probe fails"
          next: extend-quarantine

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique distinguishes per-worker vs global failure handling"
---

# Orchestrator Circuit-Breaker Per Worker

> Each worker has its own circuit state. Orchestrator tracks per-worker error rate, trips on threshold, reroutes load to healthy peers. Half-open probe re-arms after cooldown. Distinguished from global circuit-breaker by per-worker quarantine.

## When to use
- Worker pool ≥3 workers
- Homogeneous capability per task class
- Per-worker error metrics observable

## When NOT to use
- Single-worker setup
- Heterogeneous worker capability
- Global error class (upstream down)

## Glue summary
| Added element | Where |
|---|---|
| Global-vs-per-worker failure classifier | Pre-trip |
| Bounded half-open probe + permanent quarantine | Recovery |
| In-flight drain before quarantine | Trip |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
