---
name: strangler-fig-data-simulation
description: Generate migration timelines with endpoint-level cutover events, traffic splits, and realistic rollback scenarios
category: workflow
triggers:
  - strangler fig data simulation
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-data-simulation

Strangler-fig simulation data needs three layered streams: (1) a static endpoint catalog (~20-80 routes, each tagged with complexity/risk scores that bias migration order), (2) a migration event timeline where each event is {timestamp, endpoint_id, from_state, to_state, trigger} — trigger should be one of `scheduled`, `canary_promoted`, `rollback_error_rate`, `rollback_latency`, so the simulation shows both forward and backward motion, and (3) a per-tick traffic split stream giving the current {legacy_pct, modern_pct} per endpoint.

Seed the timeline with a realistic migration curve: slow start (3-5 low-risk endpoints over the first quarter of the timeline), acceleration in the middle (bulk of migrations), and a long tail of high-risk endpoints that often trigger rollbacks. Inject 1-2 rollback events per simulation — a common mistake is to only simulate happy-path forward migration, which makes the strangler-fig pattern indistinguishable from a big-bang rewrite. Rollbacks should flip traffic back to legacy within one or two ticks and optionally trigger dual-write mode before retrying.

Keep the data deterministic by seeding from a single RNG seed — strangler-fig visualizations are often reviewed in meetings where the presenter needs to replay the same scenario. Expose the seed in the UI and support URL-based seed sharing. Traffic volume per endpoint should follow a power-law distribution (a few high-traffic endpoints, many low-traffic) so migration ordering decisions visibly matter.
