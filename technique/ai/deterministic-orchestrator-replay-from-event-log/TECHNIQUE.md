---
version: 0.2.0-draft
name: deterministic-orchestrator-replay-from-event-log
description: "Orchestrator records every decision as event log; replay produces identical task graph and routing for debugging or audit."
category: ai
tags:
  - orchestrator
  - event-log
  - replay
  - determinism
  - audit

composes:
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    version: "*"
    role: replay-safety-rule
  - kind: knowledge
    ref: architecture/opensre-investigation-pipeline-architecture
    version: "*"
    role: pipeline-state-shape
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-decision-guard

recipe:
  one_line: "Every orchestrator decision (routing, retry, fallback, abort) appended to event log with monotonic seq + input hash. Replay reads log, re-emits same decisions, side effects guarded by idempotency keys."
  preconditions:
    - "Orchestrator side effects support idempotency keys (or are read-only at replay)"
    - "Event log is append-only durable store (Kafka, Postgres, etc.)"
    - "All non-deterministic inputs (clocks, RNG, network) captured in log entries"
  anti_conditions:
    - "Side effects unrecoverable (sent emails, charged cards) — replay re-fires them"
    - "Stateless throwaway tasks — replay overhead unjustified"
    - "Non-deterministic inputs not capturable (e.g. user keystrokes) — replay diverges"
  failure_modes:
    - signal: "Replay re-fires non-idempotent side effect; double charge / double email"
      atom_ref: "knowledge:pitfall/idempotency-implementation-pitfall"
      remediation: "Side-effect calls must accept idempotency key from log seq; stub-out non-idempotent calls during replay"
    - signal: "Wall-clock or RNG diverges between original and replay"
      atom_ref: "knowledge:architecture/opensre-investigation-pipeline-architecture"
      remediation: "Capture clock + RNG seed in log entries; replay reads from log instead of fresh source"
    - signal: "AI agent invents new decision branch not in original log"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Replay rejects any decision not matching log; agent in deterministic-mode (temperature=0, no tool randomness)"
  assembly_order:
    - phase: log-decision-on-fly
      uses: pipeline-state-shape
    - phase: append-to-event-log
      uses: replay-safety-rule
    - phase: replay-mode-toggle
      uses: ai-decision-guard
    - phase: idempotency-stub-side-effects
      uses: replay-safety-rule

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires idempotency key per side effect, not just log read"
---

# Deterministic Orchestrator Replay from Event Log

> Every routing/retry/fallback/abort decision appended to event log with monotonic seq + input hash. Replay re-emits same decisions; side effects guarded by idempotency keys. Enables time-travel debugging and audit.

## When to use
- Side effects accept idempotency keys (or read-only)
- Append-only durable event log available
- Non-deterministic inputs (clock, RNG) capturable

## When NOT to use
- Unrecoverable side effects (emails, charges)
- Stateless throwaway tasks
- Non-capturable non-determinism

## Glue summary
| Added element | Where |
|---|---|
| Clock/RNG capture in log entries | Logging |
| Side-effect stub-out during replay | Replay |
| Deterministic-mode AI agent (temp=0, no tool RNG) | Replay |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
