---
name: event-sourcing-visualization-pattern
description: Reusable visual encoding patterns for rendering event streams, aggregate state reconstruction, and temporal projections in canvas/SVG-based dashboards.
category: design
triggers:
  - event sourcing visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# event-sourcing-visualization-pattern

Event sourcing visualizations share a distinctive structure: a horizontally-scrolling event log lane paired with a vertically-stacked aggregate state panel. The timeline app demonstrates this with a left-anchored append-only event stream rendered as color-coded SVG rectangles (command events in accent, domain events in secondary, snapshots as wider markers), each carrying a sequence number and timestamp tooltip. The bank app extends this by drawing a running-balance sparkline that replays projected state at each event — effectively a visual fold over the event log. Both approaches anchor on a shared coordinate system where the x-axis is the global sequence position and the y-axis encodes aggregate identity, enabling cross-aggregate correlation at a glance.

The replay app adds a critical third dimension: a playback scrubber that re-derives state by walking the event array from index 0 to the cursor position. The reusable pattern here is a `replayTo(events, position)` reducer function that feeds a canvas redraw loop — the same pure fold used for persistence is reused for the UI. Color transitions (dim → bright) on the sparkline distinguish "already projected" from "not yet applied" events, giving the user an immediate sense of temporal position. When adapting this pattern, size the canvas to the expected event cardinality: use virtualized row rendering or time-bucketed aggregation once the stream exceeds ~5,000 visible events, and reserve raw per-event rendering for detail drill-downs.

Across all three apps, the key reusable atoms are: (1) an `EventCard` component (or DOM node factory) that renders type, payload hash, and timestamp; (2) a `StreamLane` horizontal scroll container with sticky aggregate headers; (3) a `ProjectionChart` that accepts a fold function and an event slice. Composing these three primitives covers the vast majority of event-sourcing dashboard needs, from audit log viewers to temporal debugging tools.
