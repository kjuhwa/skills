---

name: saga-pattern-data-simulation
description: Generate realistic saga transaction data with failure injection, compensation chains, and participant latency
category: workflow
triggers:
  - saga pattern data simulation
tags: [workflow, saga, data, simulation, transaction]
version: 1.0.0
---

# saga-pattern-data-simulation

Saga simulations need a step-graph generator that produces DAGs with 3–8 steps, each annotated with `{compensatable: bool, idempotent: bool, avgLatencyMs, failureRate}`. Seed the generator with realistic participant archetypes — `PaymentService` (compensatable via refund, non-idempotent without key), `InventoryService` (compensatable via release, idempotent), `ShippingService` (non-compensatable once dispatched, creating a pivot step), `NotificationService` (non-compensatable but safe to retry). The simulator must respect the pivot-step rule: once a non-compensatable step completes, later failures cannot trigger full rollback and must surface as `RequiresManualIntervention`.

Inject failure modes that exercise each saga variant's weak spots: for orchestrator-flow, inject coordinator crashes mid-saga to test durable state recovery; for choreography-swarm, inject duplicate events and out-of-order delivery to test event-driven idempotency; for compensation-ledger, inject partial compensation failures (compensate succeeds for step N but fails for step N-1) to test ledger replay and retry-with-backoff. Every simulated run must emit three synchronized streams: command/event messages with correlation IDs, ledger entries with monotonic sequence numbers, and participant-local state transitions — so downstream visualizations can reconstruct the same saga from any of the three viewpoints.

Parameterize concurrency (number of simultaneous sagas 1–500), clock skew between participants (±2s), and broker redelivery probability (0–15%) to stress-test assumptions. Record a ground-truth outcome for each saga (`Completed`, `Compensated`, `PartialCompensation`, `Stuck`) so the simulation can be used as a test oracle for recovery logic.
