---
version: 0.1.0-draft
name: producer-consumer-backpressure-loop
description: "Bounded-buffer producer-consumer with backpressure feedback to producer — self-regulating, idempotent, DLQ on overflow"
category: data
tags:
  - backpressure
  - producer-consumer
  - flow-control
  - bounded-buffer
  - dlq
  - feedback-loop

composes:
  - kind: skill
    ref: workflow/backpressure-data-simulation
    version: "*"
    role: backpressure-shape-baseline
  - kind: skill
    ref: backend/kafka-consumer-semaphore-chunking
    version: "*"
    role: bounded-buffer-implementation-example
    note: bounded-buffer-implementation-example
  - kind: knowledge
    ref: pitfall/backpressure-implementation-pitfall
    version: "*"
    role: feedback-mechanism-counter-evidence
    note: feedback-mechanism-counter-evidence
  - kind: knowledge
    ref: pitfall/dead-letter-queue-implementation-pitfall
    version: "*"
    role: overflow-handling-counter-evidence
    note: overflow-handling-counter-evidence
  - kind: knowledge
    ref: pitfall/rate-limiter-implementation-pitfall
    version: "*"
    role: rate-vs-buffer-distinction-counter-evidence
    note: rate-vs-buffer-distinction-counter-evidence

recipe:
  one_line: "Bounded-buffer producer-consumer with reverse signal channel. Self-regulating — backpressure slows producer when buffer fills; resume signal restarts on drain."
  preconditions:
    - "Producer publishes work faster than consumer can process it, sustained or bursty"
    - "Producer can be slowed (cooperative) or paused without losing pending work"
    - "Buffer overflow has a defined sink (DLQ or explicit drop policy)"
  anti_conditions:
    - "Producer cannot be slowed (external API push) — use rate-limiter instead"
    - "Pure throughput optimization with no buffer-fill risk — use unbounded queue + alerts"
    - "Strict ordering required across producer + consumer — backpressure may reorder"
  failure_modes:
    - signal: "Backpressure signal lost mid-flight; producer continues at full rate while consumer drowns"
      atom_ref: "knowledge:pitfall/backpressure-implementation-pitfall"
      remediation: "Signal channel must be reliable (TCP-like ack, not best-effort UDP); periodic re-broadcast of current backpressure state"
    - signal: "DLQ silently fills; overflow events lost to operator visibility"
      atom_ref: "knowledge:pitfall/dead-letter-queue-implementation-pitfall"
      remediation: "DLQ has explicit alert on depth > threshold; reprocessing path mandatory; audit trail per DLQ entry"
    - signal: "Backpressure conflated with rate-limit; producer rate-limited but buffer-fill behavior unchanged"
      atom_ref: "knowledge:pitfall/rate-limiter-implementation-pitfall"
      remediation: "Backpressure is feedback-from-buffer; rate-limit is fixed-token-bucket. Distinct mechanisms; do not substitute one for the other."
  assembly_order:
    - phase: produce
      uses: backpressure-shape-baseline
    - phase: enqueue
      uses: bounded-buffer-implementation-example
      branches:
        - condition: "buffer below high-water"
          next: consume
        - condition: "buffer at high-water"
          next: signal-backpressure
    - phase: consume
      uses: bounded-buffer-implementation-example
    - phase: signal-backpressure
      uses: backpressure-shape-baseline
      branches:
        - condition: "buffer drains below low-water"
          next: signal-resume
        - condition: "buffer overflows despite signal"
          next: dlq
    - phase: signal-resume
      uses: backpressure-shape-baseline
    - phase: dlq
      uses: bounded-buffer-implementation-example

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "the technique describes a reverse-direction signal channel distinct from the forward data channel"
  - cmd: "./verify.sh"
---

# Producer-Consumer with Backpressure Feedback Loop

> Pilots #1–#5 each had a single information direction (linear forward, decision-tree forward, event-triggered cycles, downward cascade, forward+reverse chain on the same step list). This pilot has **continuous bidirectional flow** — data moves producer → consumer, signals move consumer → producer, and the two channels are asymmetric in shape, rate, and semantics. The system is self-regulating: when the buffer fills, the backpressure signal slows the producer; when the buffer drains, an explicit "resume" signal restores normal flow.

<!-- references-section:begin -->
## Composes

**skill — `workflow/backpressure-data-simulation`**  _(version: `*`)_
backpressure-shape-baseline

**skill — `backend/kafka-consumer-semaphore-chunking`**  _(version: `*`)_
bounded-buffer-implementation-example

**knowledge — `pitfall/backpressure-implementation-pitfall`**  _(version: `*`)_
feedback-mechanism-counter-evidence

**knowledge — `pitfall/dead-letter-queue-implementation-pitfall`**  _(version: `*`)_
overflow-handling-counter-evidence

**knowledge — `pitfall/rate-limiter-implementation-pitfall`**  _(version: `*`)_
rate-vs-buffer-distinction-counter-evidence

<!-- references-section:end -->

## When to use

- A producer publishes work faster than a consumer can process it, sustained or bursty
- The consumer's processing rate is variable (downstream service latency, GC pauses, batch sizes)
- Dropping work silently is not acceptable — every item must be processed, deferred, or sent to DLQ with a reason
- The producer is **cooperative** — it can read a backpressure signal and slow down (vs an external uncontrolled producer)
- The system can tolerate eventual processing rather than real-time

## When NOT to use

- Producer cannot be slowed down (uncontrolled external traffic) — use rate limiting + load shedding instead, with explicit drop policy
- Strict latency SLO precludes any buffering — use back-of-the-envelope sizing to confirm peak throughput first
- The buffer would dwarf available memory at peak burst — needs disk-backed queue (Kafka, RabbitMQ persistent), out of scope for an in-memory bounded buffer
- One-shot batch — there's no sustained flow to regulate

## Flow shape

```
   ┌────────────────────────────────────────────────────────────────────┐
   │                                                                    │
   │    Producer  ──── data forward ────►  bounded buffer                │
   │       ▲                                  │                          │
   │       │                                  │                          │
   │       │  signal reverse (backpressure)   │  consumer pulls          │
   │       │  "slow down" / "resume"           ▼                          │
   │       └────────────────────────────  Consumer                       │
   │                                          │                          │
   │   on overflow:                           │  on success: ack         │
   │   ───► DLQ (with reason)                 │                          │
   │                                          ▼                          │
   │                                  downstream service                  │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘

   The two channels are asymmetric:
     forward:  data, high-volume, frequent
     reverse:  signal, low-volume, edge-triggered (high-water / low-water)
```

The asymmetry matters. Treating backpressure as just "the same channel in reverse" is a common error (see `pitfall/backpressure-implementation-pitfall`).

## Glue summary (net value added by this technique)

The composed atoms each describe a piece. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Two-channel separation rule — backpressure NEVER rides the data channel | Architecture |
| High-water / low-water hysteresis on buffer occupancy (not single threshold — prevents flutter) | Buffer config |
| Backpressure signal must be edge-triggered ("crossed high water"), not level-triggered ("buffer is full now") — prevents oscillation | Signal contract |
| Producer's response policy: pause / slow / drop-newest / drop-oldest / DLQ — must be explicit, NEVER silent | Producer side |
| Consumer-side idempotency required (backpressure-induced retries can re-deliver) | Consumer contract |
| DLQ entry MUST carry a reason code distinguishing "buffer full" from "consumer rejected" — debugging requires it | Overflow handler |
| Resume signal is explicit, not inferred — producer does NOT auto-detect buffer drainage | Recovery |

The atomic skills cover **how to implement a bounded buffer or a semaphore-chunked consumer**. The technique covers **the loop that closes the feedback**: the upstream signaling, the hysteresis, the idempotency invariant.

## Why high-water / low-water hysteresis (and not a single threshold)

A single threshold (e.g. "signal pause when buffer hits 80 %") oscillates: pause → drains slightly to 79 % → resume → fills to 81 % → pause again. The producer toggles state at every borderline read.

Hysteresis with two thresholds (pause at 80 %, resume at 60 %) requires a 20-point gap before reversal. The producer steady-states in one of two regimes (running or paused) and switches only at the wider boundaries. The exact gap is per-domain — the technique requires a non-zero gap, not a specific value.

## Why backpressure on a separate channel

If the backpressure signal travels in the data channel (e.g. as a special "PAUSE" message in the queue), it is delivered behind whatever data is already in transit. The producer learns to slow down only after the queue has already grown past the threshold by the in-transit amount. Latency between producer and consumer turns the signal into a lagging indicator of an already-bad state.

A separate signal channel (control plane, side-channel API, distinct topic) bypasses the data channel's queue and delivers the signal in near-real-time. The latency budget of the signal channel must be tighter than the data channel's max in-flight time.

## DLQ overflow policy

When the buffer is full AND backpressure has not yet slowed the producer, items must go somewhere. The forbidden answer is "silently drop." The acceptable answers are:

| Policy | Use when | Carries cost |
|---|---|---|
| DLQ with reason | Loss is unacceptable; replay is feasible | Storage + replay infra |
| Reject with retry | Producer can buffer locally and retry | Producer-side complexity |
| Drop-oldest | Recent data is more valuable than stale | Acceptable data loss risk |
| Drop-newest | Stale data must be processed first | Producer-visible failures during burst |
| Block until space | Producer can tolerate latency spike | Latency SLO impact |

Whichever policy, it must be **observable** — log entries, metrics, or DLQ records — never silent.

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/workflow/backpressure-data-simulation/SKILL.md" \
  "skills/backend/kafka-consumer-semaphore-chunking/SKILL.md" \
  "knowledge/pitfall/backpressure-implementation-pitfall.md" \
  "knowledge/pitfall/dead-letter-queue-implementation-pitfall.md" \
  "knowledge/pitfall/rate-limiter-implementation-pitfall.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- **In-memory bounded buffer assumption** — disk-backed queues (Kafka, persistent RabbitMQ) have different overflow semantics and recovery behavior. This technique applies cleanly only to in-process or in-cluster bounded buffers.
- **Single-producer / single-consumer assumption** — multi-producer with shared backpressure needs a fan-in step before the buffer; multi-consumer with shared signal needs coordination. Both are extensions, not in scope.
- **Idempotency key strategy is unspecified** — the technique requires that consumer-side idempotency exist; the exact key (UUID per item, content hash, sequence number) is per-domain.
- **Signal channel reliability is assumed** — if the signal channel itself fails, the producer falls back to "assume buffer is full, slow down." This is conservative but not a stated rule.
- **No measurement of the steady-state regime distribution** — the technique describes the mechanism, not how to instrument it. A sibling paper could measure how often the system spends in pause vs running across realistic workloads.
- **Cross-domain reuse caveat** — `backend/kafka-consumer-semaphore-chunking` is referenced as a concrete bounded-buffer example. The pattern abstraction is valid even if Kafka is not the actual queue; the skill provides one well-tested instantiation.

## Provenance

- Authored: 2026-04-25
- Status: pilot #6 for the `technique/` schema v0.1 — **continuous bidirectional flow with feedback loop** shape (complementary to pilots #1 linear pipeline, #2 decision tree, #3 event-driven loop, #4 hierarchical ladder, #5 forward+reverse chain)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Sibling pilots:
  - `technique/workflow/safe-bulk-pr-publishing` (linear)
  - `technique/debug/root-cause-to-tdd-plan` (decision tree)
  - `technique/testing/fuzz-crash-to-fix-loop` (event-driven loop)
  - `technique/ai/agent-fallback-ladder` (hierarchical ladder)
  - `technique/arch/saga-with-compensation-chain` (forward + reverse chain)
