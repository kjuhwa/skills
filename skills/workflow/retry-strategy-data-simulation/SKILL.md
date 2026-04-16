---
name: retry-strategy-data-simulation
description: Tick-based and promise-based simulation patterns for generating realistic retry sequences with configurable failure injection, jitter, and circuit-breaker state machines.
category: workflow
triggers:
  - retry strategy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-data-simulation

Retry simulations split into two paradigms based on the visualization goal. **Deterministic delay calculation** works for static comparisons: given a strategy enum (FIXED, EXPONENTIAL, LINEAR), base delay, and attempt index, compute the delay array upfront—`fixed: base`, `exponential: base * 2^i`, `linear: base * (i+1)`—then layer optional jitter as `delay += Math.random() * delay * jitterFactor` where jitterFactor is 0.2-0.3 (uniform distribution). Failure outcomes use a Bernoulli process: `Math.random() > successRate` per attempt, with the critical rule that once a success occurs, all subsequent attempts in that sequence are also successful (modeling a recovered service, not independent coin flips). This "success cascade" pattern matches real-world retry behavior where transient failures resolve. For competitive race simulations, wrap each strategy in an async function that loops with `await new Promise(r => setTimeout(r, scaledDelay))`, run all strategies via `Promise.all()`, and rank by total elapsed time. Force success on the final attempt (`|| attempt === maxRetries`) to guarantee termination.

**Tick-based discrete event simulation** suits continuous monitoring dashboards. Each tick (600-800ms interval via `setInterval`) processes a batch of N requests (12-20, randomized) against a circuit-breaker state machine with three states: CLOSED (normal, track failures), OPEN (reject all, increment retry counter, decrement cooldown timer), and HALF_OPEN (test single request). Transitions follow: CLOSED→OPEN when `failCount >= threshold` (typically 5), OPEN→HALF_OPEN after `cooldownTicks` (typically 8), HALF_OPEN→CLOSED on first success, HALF_OPEN→OPEN on any failure. The failure rate itself is injectable: baseline 5-10% under normal conditions, spiking to 70-90% when a "fault injection" toggle is active. This two-rate model (`Math.random() < isFaultActive ? 0.8 : 0.08`) creates realistic incident→recovery→stabilization arcs. Guard division-by-zero in rate calculations with `rps ? fails/rps : 0`.

Key simulation parameters to expose as configurable controls: base delay (100-2000ms range slider), max retries (1-10), jitter toggle (on/off or percentage), failure rate (0-100%), circuit-breaker threshold (1-10 failures), and cooldown duration (1-20 ticks). Store time-series metrics in fixed-size circular buffers (`array.push(value); if (array.length > MAX) array.shift()`) to bound memory. Each tick should update state first, then call a separate `render()` function—never mix mutation and drawing in the same pass.
