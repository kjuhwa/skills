---
name: circuit-breaker-data-simulation
description: Generate deterministic-but-jittered call traces that exercise all breaker state transitions
category: workflow
triggers:
  - circuit breaker data simulation
tags:
  - auto-loop
version: 1.0.0
---

# circuit-breaker-data-simulation

To simulate a circuit breaker without a real downstream, drive a virtual clock and emit synthetic calls at a configurable rate (RPS). For each call, roll against a time-varying failure probability: a baseline healthy rate (~2%), a configurable "incident window" where it spikes (e.g., 80% for 10s), and a recovery ramp back down. This shape reliably produces CLOSED→OPEN→HALF_OPEN→CLOSED cycles and is more instructive than uniform random failure because it mirrors real outage curves.

Wrap the generator so it emits a typed event stream: `{t, callId, outcome: 'success'|'failure'|'rejected', latencyMs, breakerStateAfter}`. Keep the breaker logic pure (a reducer over events) so the same trace can be replayed against different threshold configs for A/B comparison — this is what lets puzzle apps score user-chosen parameters and lets dashboards demo "what if we lowered the threshold to 3?" Seed the PRNG from a config hash so runs are reproducible but not identical across configs.

Include edge-case scenarios in the preset library: flapping (failure rate oscillates around threshold), slow burn (latency grows but no errors — requires latency-based tripping), thundering herd on half-open (many calls queued while OPEN, all released at once), and partial recovery (half-open probe succeeds but next call fails). These are the scenarios that expose bugs in naive implementations and make the simulation useful beyond a demo.
