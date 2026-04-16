---
name: event-sourcing-visualization-pattern
description: Reusable visual encoding patterns for rendering event streams, aggregate state, and CQRS data flow in browser-based event-sourcing UIs.
category: design
triggers:
  - event sourcing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-visualization-pattern

Event-sourcing visualizations decompose into three complementary views, each mapping a distinct ES concept to a visual channel. **Timeline view** uses a Canvas-based horizontal axis where each event is a positioned dot color-coded by event polarity (constructive events like deposit/interest in green, destructive events like withdraw/fee in red). A running accumulator drives vertical bars above or below a center baseline, giving an instant read on aggregate state drift over time. The axis step width is clamped (`Math.min(fixedStep, availableWidth / eventCount)`) so the layout degrades gracefully as the event log grows. **Aggregate inspector view** uses a three-panel grid layout — aggregate selector, event stream list, and live state snapshot — connected by a range slider that implements time-travel debugging. The slider's `max` is bound to `events.length` and its `oninput` drives a `reduce(events.slice(0, cursor))` recomputation, dimming events beyond the cursor with an opacity class (`.dimmed { opacity: .35 }`). This lets users scrub through the event history and see the exact state at any version. **CQRS flow view** uses SVG with animated dots (`requestAnimationFrame` interpolation along edge lines) to show the Command → Aggregate → Event Store → Read Model pipeline. Fan-out from the store to multiple projections is visualized with staggered `Promise.all` animations (80ms offset per projection), making the async nature of eventual consistency tangible. Each node carries a live counter updated on arrival.

All three views share a dark-theme design system (`#0f1117` background, `#6ee7b7` accent, `#1a1d27` panel fill) and follow the pattern of separating the event store (append-only array) from derived state (computed via `reduce`), so the visualization always reflects a pure fold over the event log rather than mutable state.
