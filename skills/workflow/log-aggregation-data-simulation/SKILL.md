---
name: log-aggregation-data-simulation
description: Strategies for generating realistic synthetic log streams, pattern distributions, and pipeline throughput metrics for development and demo environments.
category: workflow
triggers:
  - log aggregation data simulation
tags:
  - auto-loop
version: 1.0.0
---

# log-aggregation-data-simulation

Simulating log aggregation data requires three distinct generators matched to the visualization layer they feed. **Stream-level generation** produces individual log entries with a weighted severity lottery: error is rare (~5%), warn slightly more common (~10%), info dominates (~55%), and debug fills the remainder. Each entry combines a random service tag from a fixed roster (api-gw, auth-svc, payments, etc.) with a severity-appropriate message drawn from a curated pool (e.g., errors: "Connection refused", "OOM killed"; warnings: "Slow query 1200ms", "Disk usage 89%"). The generator fires on a tight interval (100–200ms) and pushes into a rolling bucket array, giving the timeline chart a realistic bursty-but-weighted feel. Pre-seeding 20–30 entries on init avoids the cold-start empty-screen problem.

**Pattern-frequency generation** fills a 2D matrix (patterns × time-slots) using a power-law distribution (`Math.pow(Math.random(), 2) * maxCount`) that produces many low-count cells with occasional hot spots, mimicking real log pattern clustering. Approximately 10% of cells are forced to zero to represent healthy quiet periods, preventing the heatmap from looking uniformly warm. Regenerating the matrix on a range-selector change (24h / 7d / 30d) simulates different query windows without needing a backend.

**Pipeline throughput simulation** tracks per-stage event counters incremented by particle lifecycle: a particle spawns on a random edge every ~120ms, advances at a randomized speed (0.01–0.03 progress per frame), and increments the destination stage counter on arrival. Derived metrics — ingestion rate (source count × multiplier), average latency (base + random jitter), drop rate (small random percentage), and cumulative storage (monotonically growing with store-stage throughput) — update on a 1-second tick. This particle-counter coupling ensures the displayed numbers feel connected to the visible animation rather than arbitrary, which is critical for demo credibility. All three generators are stateless and require zero backend, making them suitable for trade-show demos, design reviews, and front-end development without a running log infrastructure.
