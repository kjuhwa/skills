---
name: data-pipeline-visualization-pattern
description: Reusable visualization patterns for data pipeline monitoring — particle flow on canvas, SVG DAG topology, and multi-series throughput charts.
category: design
triggers:
  - data pipeline visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-visualization-pattern

Data pipeline UIs consistently split into three visualization archetypes, each suited to a different operator question. **Particle-flow monitors** (canvas 2D + requestAnimationFrame) answer "what is moving through the pipe right now?" by spawning particle objects `{x, y, stage, speed, err, alpha}` that advance through an ordered stage array (Ingest → Parse → Validate → Transform → Enrich → Load). Error particles are injected probabilistically (e.g., 8% rate) and visually diverge at a validation stage by fading out, giving operators an instant spatial sense of where failures cluster. A toolbar with play/pause/reset and a 4-metric stats bar (processed, errors, in-flight, error-rate%) completes the cockpit. **SVG DAG editors** answer "how are stages connected?" by rendering nodes `{id, label, x, y, state, type}` with directed edges and arrow markers. Nodes are color-coded by state (idle=#64748b, running=#facc15, done=#6ee7b7, error=#f87171) and clickable to cycle state. A side panel lists all nodes with metadata, giving both a spatial and tabular view. Node types should map to real pipeline components (Kafka source, JSON parser, schema validator, GeoIP enricher, window aggregator, Postgres sink) so the topology is domain-meaningful, not abstract.

**Multi-series throughput charts** (canvas line chart, 30-point rolling window, 1-second tick) answer "is the fleet healthy over time?" by plotting parallel pipelines (Orders ETL, Clickstream, User Sync, Logs Agg) as color-coded time-series with a dual-pane layout: chart left, metric cards right. Each card shows current rec/s plus a percentage bar for at-a-glance health. The shared dark theme (#0f1117 background, #e2e8f0 text) and consistent accent palette (teal for success, red for error, yellow for in-progress) unify the three views into a coherent design system. When building any of these, handle device-pixel-ratio scaling on canvas, use responsive sizing, and keep DOM updates batched via innerHTML replacement rather than per-element mutation.
