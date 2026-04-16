---
name: data-pipeline-visualization-pattern
description: Visualize data-pipeline stages as a directed flow graph with per-stage throughput, latency, and backpressure indicators.
category: design
triggers:
  - data pipeline visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-visualization-pattern

Model a data pipeline UI as an ordered DAG of stage nodes (source → transform → enrich → sink) connected by typed edges that carry record counts, bytes/sec, and lag. Each node exposes three live signals — input rate, output rate, and in-flight buffer depth — rendered as inline sparklines or ring gauges so operators can spot a stalled or saturated stage at a glance. Edges should animate proportional to current throughput (dashed flow for active, static for idle, red-pulse for backpressure) rather than using a uniform style, because a static diagram cannot distinguish a healthy 10k rps link from a frozen one.

For the builder variant, make the canvas the authoring surface: stages are draggable palette items, edges are drawn by handle-to-handle connection, and schema compatibility between upstream output and downstream input is validated on drop (reject or warn with a typed-mismatch badge on the edge). For the monitor variant, overlay the same graph with per-stage health chips (OK / degraded / failing) driven by rolling error rate and consumer lag thresholds, plus a timeline strip underneath that lets you scrub to a past minute and see the graph's state at that time. Keep node geometry identical across flow/builder/monitor so users can mentally map the same pipeline across the three apps.

Use a consistent color legend across all three apps: blue for data-in-flight, amber for buffered/queued, red for dropped/dead-lettered, green for committed/acked. Never repurpose these colors for unrelated UI state — operators build muscle memory on them.
