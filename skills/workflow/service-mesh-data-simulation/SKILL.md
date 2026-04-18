---

name: service-mesh-data-simulation
description: Generating realistic synthetic traffic, policy, and telemetry data for service mesh demos without a live cluster
category: workflow
triggers:
  - service mesh data simulation
tags: [workflow, service, mesh, data, simulation, synthetic]
version: 1.0.0
---

# service-mesh-data-simulation

Service mesh demos need synthetic data that mimics Istio/Linkerd/Consul shapes without requiring a real Kubernetes cluster. Model the dataset as three coupled streams: (1) a topology manifest listing services with namespace, version labels, and sidecar-injected flag; (2) a traffic matrix giving per-edge RPS, p50/p99 latency, and error rate sampled each tick; (3) a policy set (VirtualService, DestinationRule, AuthorizationPolicy, PeerAuthentication) keyed to source/destination selectors. Drive all three from a single seeded PRNG so re-renders are deterministic and screenshots reproducible.

For realistic traffic shapes, use a bimodal latency distribution (most requests 5–20ms, long tail at 200–2000ms for cold-start / GC pauses) and inject periodic error bursts on a ~60s cycle to exercise retry/circuit-breaker UI states. Model sidecar CPU as a function of RPS × policy-count so the playground surfaces the real-world cost of piling on EnvoyFilters. For mTLS simulation, randomly flip 5–10% of edges to permissive mode to exercise the "insecure edge" warning badge. Encode canary rollouts as weighted edges (90/10 split between v1 and v2 subsets) that animate the weight slider.

Cache the simulated dataset in localStorage keyed by seed so refreshes don't disrupt a user mid-exploration, and expose a "re-seed" button for generating new scenarios. When adding a new service type (gateway, serverless, external), extend the topology manifest with a `kind` discriminator rather than special-casing in the renderer — the simulator and visualizer must share one schema to avoid divergence.
