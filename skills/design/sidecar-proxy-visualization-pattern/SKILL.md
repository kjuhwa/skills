---
name: sidecar-proxy-visualization-pattern
description: Three complementary canvas/DOM views — mesh topology, request pipeline, and ops dashboard — for sidecar-proxy architectures.
category: design
triggers:
  - sidecar proxy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-visualization-pattern

The topology view places service nodes in a radial layout with small satellite circles representing Envoy sidecars adjacent to each node. Directed edges encode service-to-service communication paths, and animated particles flow along those edges to convey live request traffic. Hover tooltips surface per-node metadata (sidecar type, mTLS status, simulated RPS). Interactive drag repositioning lets operators rearrange the mesh to match mental models. The key visual encoding is *particle density on an edge = request volume*, making hot paths immediately visible without numeric overlays.

The pipeline view models the five-stage sidecar request lifecycle — Client → Sidecar Outbound → Network → Sidecar Inbound → Service — as left-to-right stage boxes connected by dashed arrows. Individual request particles traverse the pipeline at varying speeds; color encodes health (teal #6ee7b7 for success, red #f87171 for fault-injected or 5xx). A concurrent access-log panel scrolls timestamped entries with method, path, status, and latency, color-coded by HTTP status class (green 2xx, yellow 4xx, red 5xx). This dual-panel layout lets users correlate visual flow anomalies with structured log evidence simultaneously.

The dashboard view stacks four KPI stat cards (total RPS, average latency, active sidecar count, error rate %) above two 60-point rolling area charts (latency in teal, throughput in blue #60a5fa) with gradient fills and auto-scaling Y-axes, and finishes with a service status table whose rows show per-service health badges (HEALTHY/DEGRADED/UNHEALTHY), active connections, P99 latency, and error rate. All three views share a dark theme (#0f1117 bg, #1a1d27 panels), use pure vanilla JS + Canvas (no charting library), run at 60 fps via requestAnimationFrame, and resize responsively.
