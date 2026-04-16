---
name: sidecar-proxy-data-simulation
description: Generate realistic sidecar proxy traffic data including latency distributions, status code ratios, blocked-request rates, and per-service mesh configurations.
category: workflow
triggers:
  - sidecar proxy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-data-simulation

Simulating sidecar proxy behavior requires modeling three distinct data streams: request-level traffic (method, path, latency, status code), proxy-level decisions (forward vs. block), and mesh-level configuration (per-service routing, mTLS, circuit-breaker thresholds). For traffic simulation, latency values are generated with `randInt(2, 120)` to produce a realistic spread from cache-hit fast responses to slow upstream calls. Status codes follow a weighted distribution skewed toward success — the array `[200,200,200,200,201,201,404,500]` gives ~50% OK, ~25% Created, ~12.5% Not Found, ~12.5% Server Error, which mirrors a healthy-but-not-perfect production sidecar.

Blocked-request simulation uses a probability threshold (`Math.random() < 0.15`) applied at the sidecar decision point, representing rate limiting, mTLS failures, or policy rejections. This 15% block rate is high enough to be visually noticeable in the traffic flow without overwhelming the success path. Each particle carries a `blocked` boolean set at creation time, so the blocking decision is made before animation begins — matching real sidecar behavior where the proxy evaluates policy before forwarding. The flood mode (10 requests with 80ms stagger) simulates burst traffic to demonstrate how the sidecar handles sudden load spikes.

Mesh configuration data is modeled as a per-service dictionary mapping service IDs to their sidecar proxy settings: upstream type (envoy for HTTP services, tcp-proxy for databases/caches), connection pool limits, retry counts (decreasing from gateway→payment to reflect criticality), timeouts (increasing for payment flows), and circuit-breaker thresholds (30-50% error rate). This configuration structure mirrors real Envoy/Istio sidecar configs but simplified to the fields that matter for visualization. The key realism factor is that configuration varies by service role — a payment service has fewer retries but a longer timeout than a user service, and database connections use TCP proxying with pool limits instead of HTTP routing.
