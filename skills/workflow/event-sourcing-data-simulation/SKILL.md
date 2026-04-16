---
name: event-sourcing-data-simulation
description: Three strategies for generating realistic event streams in browser-based event-sourcing demos: seeded random, algorithmic synthesis, and user-command capture.
category: workflow
triggers:
  - event sourcing data simulation
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-data-simulation

The **seeded random** strategy generates a batch of mock events at startup by picking a random event type from a weighted pool and filling the payload with domain-plausible values (names from a fixed array, amounts via `Math.random() * range`, quantities as small integers). Timestamps are backdated by a random offset within a window (e.g., `Date.now() - Math.random() * 86400000` for the past 24 hours), and the batch is sorted by `ts` before being fed to the projection. This gives instant visual density on load without requiring user interaction. A "+ Random Event" button pushes additional mock events, re-sorts, and re-projects, letting users grow the stream interactively. The critical detail is sorting after insertion — event-sourcing projections assume temporal ordering, and inserting an event with a past timestamp without re-sorting creates a causality violation the fold won't catch.

The **algorithmic synthesis** strategy generates geometrically or mathematically structured events for visual aggregates. For a drawing canvas, `seedDemo()` produces circular strokes using `Math.cos/sin` loops with varying radii, colors, and center offsets, each stamped with a sequential timestamp. This approach guarantees aesthetically coherent demo state that showcases the visualization's capabilities (overlapping shapes, color variety, size variation) without relying on randomness. It's the right choice when the aggregate's visual output needs to look intentional rather than noisy.

The **user-command capture** strategy maps UI controls (amount input + command dropdown, mouse drag on canvas, form submission) directly to event creation. The command handler validates input (e.g., `amount <= 0` early return), constructs the event with `Date.now()` timestamp, pushes it to the event array, and triggers re-projection. This is the only strategy that exercises the full command-to-event-to-projection pipeline and should always be available alongside seeded data so users can observe how their actions produce events. Combining all three — seed on load for visual density, algorithmic demo for showcase mode, live capture for interactive exploration — covers the full spectrum of demo scenarios.
