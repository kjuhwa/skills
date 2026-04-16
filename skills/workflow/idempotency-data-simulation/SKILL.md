---
name: idempotency-data-simulation
description: Generating realistic request streams with controllable duplicate ratios, key collisions, and retry patterns
category: workflow
triggers:
  - idempotency data simulation
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-data-simulation

Idempotency demos need deterministic-yet-realistic request streams. Generate a base stream of unique logical operations, then apply three independent transformations: (1) a **duplication multiplier** that clones each request N times with the same idempotency key (models client retries), (2) a **jitter injector** that adds 0–500ms delays between clones (models real network retry backoff), and (3) a **corruption rate** that flips a small fraction of duplicates to have the same key but mutated payload (models the collision-detection path). Keep these as three separate sliders rather than one "chaos" knob so each failure mode can be isolated.

Seed the RNG from a visible value so reruns are reproducible — users comparing "before cache" and "after cache" need identical input streams. Emit events with `{timestamp, clientId, idempotencyKey, payloadHash, attemptNumber}` so downstream panels can group by key and count attempts. For retry-storm simulation specifically, layer an exponential-backoff generator on top: given a failure event, schedule retries at `base * 2^n + jitter` with a configurable cap, and let the user toggle jitter on/off to visualize the thundering-herd vs. smoothed pattern.

Pre-bake at least three canonical scenarios users can one-click load: "healthy retries" (10% duplicate rate, no collisions), "flaky network" (50% duplicate rate, heavy jitter), and "buggy client" (30% collision rate — same key, different payloads). These scenarios teach the contract faster than any explanatory text.
