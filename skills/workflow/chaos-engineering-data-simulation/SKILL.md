---
name: chaos-engineering-data-simulation
description: Generate deterministic synthetic telemetry for chaos experiments including fault propagation, SLO burn, and recovery curves
category: workflow
triggers:
  - chaos engineering data simulation
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-data-simulation

Chaos engineering demos need synthetic data that feels real without requiring actual production traffic. Use a **three-phase generator** seeded with a fixed RNG for reproducibility: (1) **steady-state baseline** — generate 5–10 minutes of normal p50/p95/p99 latencies and error rates per service using a lognormal distribution (μ=log(baseline_ms), σ=0.3), with error rate sampled from Beta(α=2, β=200) to get realistic ~1% noise. (2) **fault injection phase** — when the experiment starts at t=T₀, apply a fault-specific transform: latency faults multiply p99 by a factor drawn from a ramp function (linear rise over 10s, plateau, linear fall), error-rate faults shift the Beta distribution toward Beta(α=20, β=80) for a 20% error rate. (3) **propagation phase** — downstream services inherit a dampened version of upstream degradation, decaying by `0.6^hop_distance`, so a 500ms latency spike at the database shows as ~300ms at the API and ~180ms at the edge.

Crucially, simulate **SLO burn rate** as a derived signal, not a primary one: `burn_rate = (observed_error_rate / slo_error_budget) * (window_seconds / rolling_window_seconds)`. This makes burn-rate alerts emerge naturally from the fault injection rather than being hand-authored — the 14.4x fast-burn threshold will trip organically if your injected error rate is high enough, which is exactly what you want to demonstrate. Pre-compute and cache the full time series as JSON once at app startup rather than streaming — chaos dashboards are evaluated by scrubbing a timeline, not tailing live logs.

Always include a **recovery tail** after fault termination: errors don't drop instantly to zero. Model recovery as exponential decay with τ=30s for stateless services and τ=180s for services with connection pools or circuit breakers that need to close. Omitting this tail is the single most common tell that chaos data is fake.
