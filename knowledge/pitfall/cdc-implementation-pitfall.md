---
name: cdc-implementation-pitfall
description: Critical bugs in CDC visualization apps around snapshot consistency, operation distribution skew, and cross-table replay ordering.
category: pitfall
tags:
  - cdc
  - auto-loop
---

# cdc-implementation-pitfall

The most dangerous CDC pitfall is **missing the before-snapshot on mutations**. In cdc-table-diff, every UPDATE and DELETE must clone the current table state *before* applying the change, then render the clone as the "before" panel. If you apply the mutation first and try to reconstruct the prior state, you've lost it — particularly for DELETE where the row no longer exists. The app handles this with `clone()` via `JSON.parse(JSON.stringify(obj))`, but this only works for JSON-serializable data. Any CDC diff viewer that skips this clone step will show identical before/after panels, making the tool useless. In production Debezium connectors, this maps to the `before` field in change events — if `REPLICA IDENTITY` is not set to `FULL` on PostgreSQL tables, UPDATE and DELETE events arrive with a null `before` block, and your downstream diff viewer has nothing to compare against.

**Operation distribution skew** silently ruins realism. The stream-visualizer uses uniform random selection across the three operations, producing a ~33/33/33 split. Real CDC streams from OLTP databases typically show 10-20% INSERT, 60-70% UPDATE, 10-20% DELETE in steady state, with INSERT-heavy bursts during batch loads or migrations. Using flat `Math.random()` without weighted selection misleads capacity planning and gives users a false mental model of production traffic. The fix is cumulative probability thresholds or a weighted-random utility function that takes `{INSERT: 0.15, UPDATE: 0.70, DELETE: 0.15}` as input.

**Cross-table replay ordering** is the third trap. The table-diff allows switching between tables via a dropdown, but there is no per-table event index or changelog filter. If a user switches tables mid-session, they see the current mutated state without knowing which changes were applied to that table versus others. The pipeline-monitor compounds this: connector lag values grow unboundedly for `lagging` and `stopped` connectors with no reset or recovery path, meaning the simulation diverges from reality over time — real connectors either recover (lag drops) or get killed and restarted (lag resets). Without state transitions between `lagging → running` or `stopped → running`, the monitor only shows degradation, never recovery, which trains incorrect operational intuition.
