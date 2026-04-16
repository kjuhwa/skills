---
name: materialized-view-data-simulation
description: Generate realistic MV topology, freshness telemetry, and query-match scoring without a live database.
category: workflow
triggers:
  - materialized view data simulation
tags:
  - auto-loop
version: 1.0.0
---

# materialized-view-data-simulation

Simulating materialized view infrastructure requires three data layers. **Topology** is modeled as a static node-edge graph: base tables (`orders`, `products`, `users`) have fixed row counts and feed MVs through named edges; MVs can depend on other MVs (e.g., `mv_dashboard` consumes `mv_sales` and `mv_top_customers`), forming a DAG. Each node carries metadata — `rows`, `lastRefresh` (relative timestamp string), `stale` (boolean), and `sources` (parent table names). A "Refresh All" action increments row counts by a random delta (0–19), resets `stale` flags, and updates timestamps, simulating the post-refresh state without actual SQL execution.

**Freshness telemetry** is driven by a `setInterval` loop (5-second tick) that increments each MV's `elapsedSec` counter against its configured `refreshSec` cycle (ranging from 120s for hot aggregates to 3600s for batch summaries). A 20-element history ring buffer records elapsed values at each tick, feeding sparkline rendering. The ratio `elapsed / refreshSec` produces a percentage that buckets into fresh (< 80%), warning (80–100%), or stale (> 100%). Manual refresh resets elapsed to zero, randomizes row count, and pushes a zero entry into the history buffer.

**Query-match scoring** parses SQL via regex to extract referenced tables, aggregation functions (`SUM`, `AVG`, `COUNT`, `MAX`, `MIN`), and `GROUP BY` columns, then scores each candidate MV: +50 for exact table-set match, +20 for partial overlap, +30 for matching aggregation, +20 for matching GROUP BY column. Scores above 80 yield a REWRITE recommendation (direct MV substitution), 40–80 yield PARTIAL (possible with filtering), and below 40 yield NO MATCH. The top score doubles as a cost-reduction proxy (e.g., "~80x faster"), bridging the gap between schema-level analysis and execution-plan visualization.
