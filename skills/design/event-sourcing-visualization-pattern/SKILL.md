---
name: event-sourcing-visualization-pattern
description: Three complementary views for visualizing event-sourced aggregates: timeline replay, balance trajectory chart, and canvas state reconstruction.
category: design
triggers:
  - event sourcing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-visualization-pattern

An event-sourcing visualization decomposes into three view archetypes that map naturally to the domain. The **timeline view** renders each event as a horizontal card showing type, payload summary, and timestamp, with CSS class toggling (`.active`, `.replaying`) to highlight the current replay position. A time-travel slider binds to a `replayIdx` integer that controls how many events the projection function consumes; scrubbing the slider re-runs the pure fold from index 0 to `replayIdx` and dumps the resulting aggregate state into a JSON panel beside the timeline. The replay button advances `replayIdx` via `setInterval` at a configurable speed multiplier (e.g., 80ms base × 1–10x), giving the user an animated walk through history. This pattern works for any aggregate whose state is a JSON-serializable object.

The **trajectory chart** plots a derived metric (balance, order count, stock level) at each event boundary. A canvas-based line plot iterates the event array, calls the fold at each index to extract the metric, normalizes points to a min/max range (guarding division-by-zero with `max - min || 1`), and draws connected markers. This view answers "how did the aggregate evolve?" rather than "what happened?", and pairs well with the timeline for drill-down. The **canvas reconstruction** view is for aggregates whose state is visual (drawings, layouts, spatial data): it clears the rendering surface, iterates the immutable event log, and replays each event's payload (stroke points, coordinates) through the 2D context. Undo is a `pop()` on the event array followed by full re-projection — no inverse operations needed because the event log is the single source of truth and the canvas is stateless between redraws.

Across all three views, the key reusable contract is: events are an append-only array, the projection function is a pure fold with no side effects, and the UI layer never reads mutable aggregate state directly — it always calls the fold to produce a fresh snapshot before rendering. This separation means any view can be swapped or composed without touching the event store or projection logic.
