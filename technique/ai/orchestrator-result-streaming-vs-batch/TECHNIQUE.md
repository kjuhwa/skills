---
version: 0.2.0-draft
name: orchestrator-result-streaming-vs-batch
description: "Orchestrator selects per-task result delivery mode — streaming for interactive consumers, batch fan-in for downstream pipelines."
category: ai
tags:
  - orchestrator
  - streaming
  - batch
  - result-delivery
  - mode-selection

composes:
  - kind: skill
    ref: workflow/swagger-ai-optimization
    version: "*"
    role: producer-side-discipline
  - kind: knowledge
    ref: pitfall/backpressure-implementation-pitfall
    version: "*"
    role: streaming-discipline
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: ai-output-guard

recipe:
  one_line: "Orchestrator inspects per-task consumer contract: streaming (token-by-token, low first-byte latency) for chat UIs; batch fan-in (single payload after all tasks complete) for downstream batch pipelines."
  preconditions:
    - "Consumer contract explicit (interactive vs pipeline)"
    - "Workers can produce streaming output (or fall back to batch)"
    - "Backpressure mechanism for streaming (slow consumer pauses producer)"
  anti_conditions:
    - "Single-mode consumers — orchestrator selection adds no value"
    - "Workers can't stream — batch is the only option, no choice"
    - "Hybrid contract (some interactive, some batch in same response) — orchestrator can't choose at task level"
  failure_modes:
    - signal: "Streaming mode chosen for batch consumer; pipeline accumulates partial chunks"
      atom_ref: "skill:workflow/swagger-ai-optimization"
      remediation: "Consumer contract must be machine-checkable (Accept header, content-type, or explicit param); orchestrator validates before mode selection"
    - signal: "Streaming consumer slow; producer buffers fill; OOM"
      atom_ref: "knowledge:pitfall/backpressure-implementation-pitfall"
      remediation: "Backpressure required for streaming mode — slow consumer pauses producer (TCP-style window or explicit ack)"
    - signal: "AI hallucinates streaming chunks not from real worker progress"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Each chunk must trace to worker checkpoint; orchestrator rejects synthetic chunks"
  assembly_order:
    - phase: inspect-consumer-contract
      uses: producer-side-discipline
    - phase: select-mode
      uses: producer-side-discipline
      branches:
        - condition: "interactive contract"
          next: streaming-mode
        - condition: "batch contract"
          next: batch-mode
    - phase: streaming-mode
      uses: streaming-discipline
    - phase: batch-mode
      uses: ai-output-guard

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique requires machine-checkable consumer contract, not heuristic guessing"
---

# Orchestrator Result Streaming vs Batch Mode

> Orchestrator inspects consumer contract per task. Streaming for interactive (chat UI, low first-byte latency). Batch fan-in for downstream pipelines (single payload after completion). Backpressure mandatory in streaming mode.

## When to use
- Consumer contract explicit
- Workers stream-capable (or batch-fallback)
- Backpressure available for streaming

## When NOT to use
- Single-mode consumers
- Workers batch-only
- Hybrid contract within one response

## Glue summary
| Added element | Where |
|---|---|
| Machine-checkable consumer contract requirement | Inspection |
| Backpressure mandatory in streaming | Streaming mode |
| Chunk-must-trace-to-checkpoint guard | AI guard |

## Provenance
- Authored 2026-04-26 in batch with 9 sibling orchestrator techniques
