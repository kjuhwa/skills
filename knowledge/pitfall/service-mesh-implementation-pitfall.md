---
name: service-mesh-implementation-pitfall
description: Conflating mesh-layer (Envoy) circuit breaking with application-layer retry logic produces misleading simulations
category: pitfall
tags:
  - service
  - auto-loop
---

# service-mesh-implementation-pitfall

A common mistake in service-mesh demos is modeling circuit breakers as a single boolean per service. In real Istio/Envoy, circuit breaking happens at the **upstream cluster + host** granularity inside each sidecar — service A's sidecar may have ejected one of B's three pods while still routing to the other two. If your simulator shows a single open/closed state for "service B," users will build wrong mental models and be surprised when their production policies don't behave as expected. Always model per-endpoint state and aggregate up for display.

Another pitfall: simulating retries at the application layer when Istio handles them via VirtualService `retries` config. If both layers retry, the actual request amplification is multiplicative (app retries × mesh retries), which can turn a single user request into 9+ upstream calls during a partial outage and accelerate circuit trips. Demos should explicitly show the retry budget consumption and the request-id propagation so users see why mesh-level retries must replace, not augment, app-level retries.

Finally, AuthorizationPolicy evaluation order trips up most simulator authors: DENY policies always win regardless of specificity, and the *absence* of any ALLOW policy in a namespace with at least one ALLOW results in default-deny — not default-allow. If your simulator implements "most specific rule wins" or treats policies as additive, the simulated outcomes will diverge from real Istio behavior on the exact edge cases (cross-namespace calls, JWT-less requests to JWT-required workloads) that operators most need to test.
