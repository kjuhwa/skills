---
name: idempotency-visualization-pattern
description: Visual encoding patterns for rendering idempotency key deduplication, function stability, and state machine no-ops in browser-based simulations.
category: design
triggers:
  - idempotency visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-visualization-pattern

Idempotency has three distinct visual signatures that each require a dedicated encoding. For **key-based deduplication** (API/payment style), use a three-panel layout: request log, key store, and response log. Color-code entries as NEW (green) vs DUPLICATE (amber/pink) using a CSS class toggle. Display running counters for sent, actually-processed, and deduped requests — the widening gap between sent and processed is the core visual proof that idempotency is working. Prepend entries (most recent on top) so the user sees the dedup decision immediately without scrolling.

For **function-level idempotency** (f(f(x)) = f(x)), use a card grid where each card wraps a sparkline canvas. Plot the output value on each successive application: idempotent functions produce a flat line after the first application (stable), while non-idempotent functions produce a diverging curve (drift). Apply a `stable` vs `unstable` CSS class to the card border based on the last N values being identical. The stabilization point — the exact step where the line goes flat — is the key insight to highlight.

For **state-machine idempotency**, render states as SVG circles connected by directional arrows. Fill traversed states with the accent color and gray out future states. When a duplicate event fires, flash the log entry with a distinct "no-op" indicator (e.g., lightning bolt icon + "already in STATE — no-op") rather than silently swallowing it. Tracking `transitionCount` vs `duplicateCount` as separate metrics makes the deduplication ratio explicit.
