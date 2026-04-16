---
name: strangler-fig-implementation-pitfall
description: Dual-write state drift and route-decision caching that silently breaks the migration
category: pitfall
tags:
  - strangler
  - auto-loop
---

# strangler-fig-implementation-pitfall

The most common strangler-fig pitfall is treating dual-write as fire-and-forget: writes go to both legacy and modern, but reconciliation isn't monitored. Within days the two stores drift (different timestamps, missing rows from transient failures, different null-handling), and when you finally cut reads over to modern, users see stale or missing data. Always pair dual-write with a continuous diff job that samples reads from both sides and alerts on divergence — and block the read cutover until divergence is below a threshold for N consecutive days, not just "once."

A second pitfall is caching the route decision in the facade. For performance, teams cache "endpoint X → modern" in-memory or in Redis, but then a rollback event doesn't propagate — some pods keep routing to the broken modern service. Route decisions must either be read fresh per-request from a fast config store (feature-flag service, etcd) or be invalidated via pub/sub on every migration event. Never TTL-cache them for more than a few seconds.

Third: migration order chosen by engineering convenience rather than blast radius. Teams migrate the easiest endpoints first to build momentum, which is fine, but they skip load-testing the facade under the *final* traffic mix. The facade becomes the bottleneck precisely when the last high-traffic endpoint cuts over, and rollback at that point is painful because the legacy side has atrophied. Load-test the facade at projected end-state traffic before starting, not after.
