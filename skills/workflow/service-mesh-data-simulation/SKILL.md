---
name: service-mesh-data-simulation
description: Generate realistic Envoy/Istio telemetry streams with correlated RPS, latency percentiles, and circuit breaker state transitions
category: workflow
triggers:
  - service mesh data simulation
tags:
  - auto-loop
version: 1.0.0
---

# service-mesh-data-simulation

Service mesh demos need telemetry that *behaves* like Envoy stats — not random noise. Model each service-to-service edge as a Poisson arrival process with a base RPS, then layer perturbations: a slow drift (sine wave, period ~5min) for diurnal pattern, occasional spikes (Bernoulli trigger), and correlated latency that follows a log-normal distribution with p50/p95/p99 derived from a single shape parameter. When you inject a fault, propagate it: a 500-err spike on service B should raise upstream A's p99 and consecutive-error count, not just B's error rate.

Circuit breaker state must be derived from the same stream, not generated independently. Implement the Envoy outlier detection state machine: track consecutive 5xx responses per upstream host, trip when count ≥ `consecutive_5xx` threshold (default 5), eject for `base_ejection_time` × eject_count, then half-open with a single probe. Half-open success → closed; half-open failure → re-eject with doubled time. Surface all three Envoy stats (`upstream_rq_pending_overflow`, `ejected_active`, `success_rate`) so the visualization can render the trip cause, not just the trip event.

For policy simulators, generate request streams tagged with synthetic JWT claims, source namespaces, and SNI values, then evaluate them against the loaded AuthorizationPolicy set using the Istio rule precedence (DENY > ALLOW > default-allow-if-no-policy). Show the *matched rule* for each request so users learn the evaluation order, not just allow/deny outcomes.
