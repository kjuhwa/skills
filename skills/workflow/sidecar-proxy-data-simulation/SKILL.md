---

name: sidecar-proxy-data-simulation
description: Generate synthetic sidecar proxy traffic with realistic latency, retry, and mTLS handshake semantics.
category: workflow
triggers:
  - sidecar proxy data simulation
tags: [workflow, sidecar, proxy, data, simulation, synthetic]
version: 1.0.0
---

# sidecar-proxy-data-simulation

Model each simulated request as a state machine traversing hops: `app_egress → local_sidecar_out → network → remote_sidecar_in → remote_app → remote_sidecar_out → network → local_sidecar_in → app_ingress`. Attach a latency contribution per hop drawn from a configurable distribution (log-normal for network, fixed+jitter for sidecar processing ~0.5–2ms, one-time mTLS handshake cost ~5–30ms amortized via connection reuse). This hop decomposition is what makes simulated p50/p99 numbers feel credible and lets the config-lab show the cost of adding a new filter.

Seed traffic with a small service graph (3–7 services) and per-edge RPS, then let each service fan out to downstreams based on a call-ratio matrix. Inject faults at the sidecar layer — not the app — to reflect reality: connection resets, 503s from upstream circuit-breaker trips, retry budget exhaustion, and rate-limit rejections. Each synthetic event should carry `{trace_id, source_workload, dest_workload, protocol, mtls_used, outcome, latency_ms, retry_count}` so downstream visualizations can filter and aggregate consistently across the explorer, config-lab, and traffic-sim apps.

Expose three tunable knobs at minimum: global RPS multiplier, fault-injection probability per edge, and policy-change events (timeout/retry/circuit-breaker config pushes) that take effect after a simulated xDS propagation delay (~100–500ms). Replaying the same seed must produce identical traces so users can A/B compare "before policy change" vs "after" deterministically — this reproducibility is non-negotiable for a config lab.
