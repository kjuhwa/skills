---
name: api-gateway-pattern-data-simulation
description: Generate realistic gateway traffic with burst patterns, policy hits, and backend-selection skew driven by a seeded PRNG
category: workflow
triggers:
  - api gateway pattern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# api-gateway-pattern-data-simulation

Simulate api-gateway-pattern traffic as a layered stream: a baseline Poisson arrival (λ configurable, default 40 rps) overlaid with scheduled bursts (e.g., every 30s spike to 5λ for 3s to exercise the rate-limiter) and a slow diurnal sine (±20%) so the graphs don't look flat. Each synthetic request carries `{id, clientTier, path, method, bytes, headers, arriveAt}` where `clientTier` is drawn from a weighted distribution (free:70%, pro:25%, enterprise:5%) because rate-limit and routing decisions hinge on tier — a uniform distribution makes the rate-limiter variant look broken.

Route paths from a fixed catalog that matches the backend grid: `/users/*` → users service, `/orders/*` → orders, `/billing/*` → billing, `/inventory/*` → inventory, plus a 5% "unknown path" slice that must reject with 404 at the gateway so the reject-reason panel has something to show. Inject policy-triggering traffic on purpose: ~8% missing-auth, ~3% malformed-JSON bodies (for inspector), ~2% oversized payloads (>1MB), and tier-specific bursts that exceed the bucket (free tier bursts to 50 rps from a single clientId for 2s). All of this must come from a seeded PRNG (mulberry32 with a visible seed input) so "replay last run" reproduces the exact same frame sequence — users debugging their gateway config need determinism.

Backend responses are simulated with per-service latency distributions (users: lognormal μ=30ms σ=0.4, billing: μ=120ms σ=0.8 because it calls an external payment API in the pretend world) and a per-service error rate that the user can nudge with a slider to see how the gateway's circuit-breaker sub-band reacts. Never simulate backend latency below 1ms — it makes the gateway's own overhead look disproportionate and misleads users into thinking the gateway is the bottleneck.
