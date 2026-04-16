---
name: cqrs-visualization-pattern
description: Split-pane command/query flow visualizer with distinct write-model and read-model lanes for CQRS apps
category: design
triggers:
  - cqrs visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-visualization-pattern

CQRS visualizations should render the command side (left lane) and query side (right lane) as visually distinct swim-lanes, with an explicit projection/sync arrow crossing between them. The command lane shows: incoming command → validator → aggregate/write-model → event emission. The query lane shows: materialized view(s) → query handler → response. Use one color family for write (e.g., amber/red — mutation) and another for read (e.g., blue/green — safe), and animate events traveling from write to read so eventual-consistency lag is visible rather than hidden.

For cqrs-flow-visualizer and read-write-split-lab style apps, expose a "projection delay" slider (0–5000ms) so users can watch the read model catch up after a command. Render the event log as a middle column or bus between the two lanes — this makes it obvious that reads never touch the write store directly. For event-sourced-counter style apps, layer a replay timeline below the lanes so the user can scrub through events and watch the projection rebuild; the current counter value should visibly tick as each event is re-applied.

Always surface three counters in a HUD: commands/sec, events/sec, queries/sec. Divergence between event rate and query-model update rate is the single most useful diagnostic signal in a CQRS demo, and hiding it defeats the purpose of the visualization.
