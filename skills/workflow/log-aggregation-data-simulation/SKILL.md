---

name: log-aggregation-data-simulation
description: Generating realistic synthetic log streams with bursts, level distributions, and source correlation for demo UIs
category: workflow
triggers:
  - log aggregation data simulation
tags: [workflow, log, aggregation, data, simulation, synthetic]
version: 1.0.0
---

# log-aggregation-data-simulation

Realistic log aggregation demos require simulation that matches production statistical shape, not uniform random noise. Generate logs with a **Poisson base rate per source** (e.g., 5-50 logs/sec/service) multiplied by a diurnal sine envelope (higher daytime volume), then inject **burst events**: correlated error storms where one upstream service failure triggers elevated error rates in 2-4 downstream services within a 10-60 second window. Level distribution should follow roughly `info 70%, debug 15%, warn 10%, error 4%, fatal 1%` during normal operation, shifting to `error 30-50%` during burst windows. Without bursts and correlation, the heatmap looks flat and the stream river looks like static — operators instantly recognize this as fake.

Log message bodies should draw from a templated pool per service (`"GET /api/users/{id} 200 {ms}ms"`, `"Connection pool exhausted: {n}/{max}"`, `"JWT expired for user={uid}"`) with a small set of structured fields (trace_id, span_id, user_id, host) so query-console filters have something meaningful to match. Reuse trace_ids across 3-8 correlated log entries to demonstrate distributed tracing joins. Seed the RNG so demos are reproducible, but expose a "live mode" that streams new entries on a wall-clock interval (50-200ms ticks) with a rolling window (last 10k-100k entries) to avoid unbounded memory. Pre-generate 1-2 hours of historical data on page load so the heatmap has content before the live stream fills it in.
