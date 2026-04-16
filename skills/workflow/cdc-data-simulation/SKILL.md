---
name: cdc-data-simulation
description: Synthetic CDC event generation patterns for realistic stream monitoring, table replay, and pipeline flow testing without a live database.
category: workflow
triggers:
  - cdc data simulation
tags:
  - auto-loop
version: 1.0.0
---

# cdc-data-simulation

CDC simulations require three distinct generation strategies depending on the visualization target. For **stream-level monitoring** (the particle view), events are spawned probabilistically each animation frame (`Math.random() < 0.3`) with weighted operation distribution: ~50% INSERT, ~35% UPDATE, ~15% DELETE. Each event carries a random table name from a fixed roster (`users`, `orders`, `products`, `payments`, `sessions`, `logs`) and randomized visual properties (velocity 1–3px/frame, radius 3–7px). The particle fades after passing 70% of the viewport height, simulating consumption lag. This stochastic approach produces bursty, realistic-looking traffic without needing a real WAL or binlog.

For **table-level replay** (the diff view), events must be deterministic and ordered. A pre-authored changeset array defines each operation with explicit table, operation type, primary key, changed field, and new value. INSERT operations carry a full row object; UPDATE operations specify a single field mutation; DELETE operations reference only the key. The viewer maintains mutable in-memory table state (`data[tableName]`), clones it as "before" snapshot before applying each change, then renders both side-by-side. This clone-then-mutate pattern is critical — without the snapshot, diff highlighting has no baseline. The change counter (`ci/changes.length`) gives users a progress indicator so they know how deep into the changelog they are.

For **pipeline-level flow** (the builder view), simulation is edge-based: each animation tick iterates all edges and spawns a dot with 8% probability (`Math.random() < 0.08`). Each dot carries a `t` parameter from 0→1, interpolating linearly between source output port and sink input port. Dots fade as `t` increases (opacity = `1 - t*0.5`) and are culled at `t > 1`. This per-edge independent spawning means busier pipelines (more edges) naturally show more traffic, and fan-out/fan-in topologies visually demonstrate throughput distribution without explicit rate modeling.
