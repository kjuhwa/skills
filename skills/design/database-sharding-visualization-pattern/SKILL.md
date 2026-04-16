---
name: database-sharding-visualization-pattern
description: Canvas-based visual metaphors for shard routing, hash-ring placement, and data distribution across database shards.
category: design
triggers:
  - database sharding visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# database-sharding-visualization-pattern

Shard topology visualization relies on three complementary visual metaphors, each mapping to a core sharding concept. The **flow-particle pattern** renders a central router node with animated particles traveling to destination shard boxes via eased interpolation (`t < 0.5 ? 2t² : -1+(4-2t)t`), making routing strategy differences (hash-mod, range-partition, round-robin) immediately visible. Each shard is drawn as a labeled rounded rectangle at evenly-spaced x-coordinates (`W/(N+1)*(i+1)`), with per-shard hit counters overlaid so skew is apparent at a glance. The **hash-ring pattern** plots nodes and keys as circles on a 360-degree ring using polar-to-cartesian conversion (`angle - 90° * π/180`), with ownership arcs connecting each key to its clockwise-nearest node. Color-coding each node and its owned keys makes partition ownership and rebalance impact intuitive when nodes are added or removed.

For the data-distribution layer, horizontal **bar-fill gauges** per shard show record counts as percentages of the current maximum, with a "hot" CSS class triggered when a shard exceeds 1.4x the average — a simple threshold that catches skew without false positives on small clusters. All three views share a dark-background palette (`#0f1117` / `#1a1d27`) with mint-green accent (`#6ee7b7`) and semi-transparent strokes for connection lines, which keeps shard counts and key labels readable even when dozens of particles or keys overlap. The key reusable insight is that sharding UIs need both a **topology view** (where data lives) and a **flow view** (how data gets there) — combining ring/grid placement with animated routing makes the otherwise-invisible hash function behavior tangible.

Stats panels should update every animation frame and show both absolute counts and relative percentages. The consistent-hash-ring view additionally needs a sorted-node lookup (`findNode` walks clockwise) and a mapping table that groups keys per node — this dual representation (visual ring + textual ownership list) is essential because the ring alone becomes unreadable past ~20 keys.
