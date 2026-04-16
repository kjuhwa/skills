---
name: canary-release-visualization-pattern
description: Canvas particle traffic flow, SVG polyline metric charts, and vertical phase-dot timelines for canary deployment UIs.
category: design
triggers:
  - canary release visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-visualization-pattern

Canary release visualizations split into three complementary views, each with a distinct rendering technique. **Traffic flow** uses an HTML Canvas with `requestAnimationFrame` particle animation: requests spawn at a load-balancer origin, acquire a color (blue for stable, mint-green `#6ee7b7` for canary, red `#f87171` for errors), then drift toward destination lanes using lightweight gravity physics. The canary lane's particle ratio tracks a user-controlled slider (0–100%), and an intentional error rate (e.g., 8%) turns a fraction of canary particles red mid-flight, giving operators an instant spatial sense of failure distribution.

**Metric monitoring** renders as a 2×2 card grid where each card wraps an SVG `<polyline>` chart. Two rolling data arrays (stable vs. canary) hold the latest N ticks (typically 40) of error-rate and p50-latency samples. The simulation injects a performance-degradation phase—after tick 60 the canary's latency jumps to ~150 ms and error rate rises to 3%—to stress-test the dashboard's visual affordances: line color shifts, threshold breach markers, and an event-log feed. Auto-promotion logic bumps the canary traffic bar from 5% toward 50% every 10 ticks, halting on anomaly.

**Timeline progression** is a vertical dot-and-connector layout with five canonical phases: Build & Push → Canary Deploy (5%) → Monitor (5-min window) → Promote 25% → Promote 100%. Each dot carries a status color (green/yellow/blue/red) and clicking a step opens a detail panel with build hash, image size, latency budget, error budget, CPU, and memory. A rollback button injects a red-dot phase with a reason string. All three views share a dark palette (`#0f1117` background, `#6ee7b7` accent, `#3b82f6` stable-blue, `#f87171` error-red) and system-ui sans-serif typography for visual cohesion.
