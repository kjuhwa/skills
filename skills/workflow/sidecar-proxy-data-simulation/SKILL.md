---
name: sidecar-proxy-data-simulation
description: Generate synthetic Envoy-style telemetry with listener/cluster/route hierarchy and injectable policy/latency faults
category: workflow
triggers:
  - sidecar proxy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-data-simulation

Simulate sidecar proxy data by modeling the Envoy object graph explicitly: listeners (inbound:15006, outbound:15001), filter chains, clusters (one per upstream service + passthrough), endpoints, and RDS routes. Seed a small service mesh (4–8 services) with a deterministic call graph, then generate requests as events carrying {trace_id, source_pod, dest_service, path, method, headers}. Each request should fan out through a pipeline function that applies listener match → filter chain → HTTP connection manager → router → cluster LB → endpoint, recording a span at each hop. This lets flow, policy, and latency apps share one generator and toggle which hops they visualize.

Inject realistic faults via three knobs: policy rules (AuthZ allow/deny with principal + path matchers mirroring Istio AuthorizationPolicy), latency distributions per hop (log-normal for app, fixed+jitter for TLS handshake, bimodal for cold-start filter compilation), and failure modes (503 upstream_reset, 504 upstream_timeout, 403 rbac_denied). Emit access logs in Envoy's default format string so downstream views can parse response_flags (UH, UF, UO, NR, RL) into human-readable causes.

For the latency-scope view specifically, precompute p50/p90/p99 per hop per route over a sliding window, and tag each request with whether it breached the SLO — this enables heatmaps and percentile-split coloring without recomputation on every frame. Keep the generator pure and seedable so the same scenario reproduces across reloads and demos.
