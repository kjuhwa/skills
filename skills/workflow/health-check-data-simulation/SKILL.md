---
name: health-check-data-simulation
description: Stochastic tick-based simulation of service latency, resource utilization, and uptime status using biased random walks with threshold-triggered state transitions.
category: workflow
triggers:
  - health check data simulation
tags:
  - auto-loop
version: 1.0.0
---

# health-check-data-simulation

All three apps share a common data simulation architecture: a fixed array of named service/metric objects, each mutated in-place on a periodic `setInterval` tick, with the UI re-rendered after every mutation cycle. The heartbeat monitor simulates latency via a biased random walk (`latency += round((random() - 0.48) * 10)`) clamped to a minimum of 1ms, where the 0.48 bias (instead of 0.50) creates a slight upward drift that makes threshold breaches (latency > 100ms) inevitable over time — modeling real-world degradation. The vitals ring uses an identical pattern (`value += (random() - 0.47) * 8`) with a tighter bias of 0.47 and hard clamping between 5 and max, ensuring metrics trend toward warning thresholds. The uptime heatmap takes a different approach: one-shot probabilistic generation where each cell is assigned `down` (6%), `degraded` (9%), or `ok` (85%) via cumulative probability thresholds — modeling a 30-day historical snapshot rather than live ticks.

The key reusable pattern is the "biased coin" random walk: pick a center slightly below 0.5 (0.47–0.48) so values drift upward toward alert thresholds, making the simulation feel realistic rather than purely random. The step magnitude (8–10 units) should be tuned relative to the threshold gap — for a 100ms latency threshold starting at ~40ms, a ±10 step means roughly 6–12 ticks to breach, which at 500ms intervals gives 3–6 seconds of "calm" before the first alert. For resource utilization with an 85% warning line starting at ~50%, a ±8 step needs ~4–5 ticks at 1500ms for first warnings. This creates a natural tension cycle: gradual climb, threshold breach, partial recovery, re-breach — without scripted scenarios.

For historical/batch data (like the heatmap), use weighted probability buckets rather than random walks. The 6%/9%/85% split for down/degraded/ok mirrors real-world SLA targets (~99.9% monthly uptime ≈ ~0.1% downtime, but exaggerated for visual density). When generating heatmap data, consider temporal correlation — real outages cluster rather than distribute uniformly. A production-quality simulation should introduce "incident windows" (3–5 consecutive degraded/down cells) by occasionally setting a sticky state that persists for N ticks before resetting. The current implementations skip this, producing uniform random scatter that looks less realistic than clustered failure patterns.
