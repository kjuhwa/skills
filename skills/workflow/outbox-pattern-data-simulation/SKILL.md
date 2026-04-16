---
name: outbox-pattern-data-simulation
description: Generate deterministic outbox event streams with configurable failure and duplicate scenarios for demos
category: workflow
triggers:
  - outbox pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# outbox-pattern-data-simulation

Seed the simulation with a pseudo-random generator (seeded from a URL param or input field) so that scenarios are reproducible. Generate business events in bursts rather than uniformly — e.g. 5 events in 100ms, then idle 2s — to mirror real traffic shapes and expose relay lag. Each synthetic event should carry `aggregate_id`, `aggregate_type` (rotate among `Order`, `Payment`, `Shipment`), `event_type`, a JSON `payload`, and an `occurred_at` timestamp. Insert them into an in-memory outbox array with `status: "PENDING"` and `retry_count: 0`.

Model the relay as a setInterval poller (configurable 200ms–2s) that reads up to N pending rows, flips them to `PROCESSING`, simulates a broker publish with a configurable success probability (default 95%), and on success marks `PUBLISHED` with a `published_at` timestamp. On failure, increment `retry_count`, apply exponential backoff (`2^retry_count * 100ms` until next eligible poll), and move to `FAILED` once `retry_count >= 5`. Surface a toggle to inject "duplicate publish" where the relay marks a row `PUBLISHED` but the broker lane shows the event arriving twice — this demonstrates why downstream consumers need idempotency keys.

Include three preset scenarios selectable from a dropdown: "Happy Path" (100% success, steady load), "Flaky Broker" (70% success, exposes retry behavior), and "Relay Crash" (relay stops mid-batch with rows stuck in `PROCESSING`, demonstrating the need for a stuck-row recovery sweep that resets `PROCESSING` rows older than a threshold back to `PENDING`). Record each simulation run's metrics (throughput, p50/p99 lag, duplicate rate) for side-by-side comparison.
