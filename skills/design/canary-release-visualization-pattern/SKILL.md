---
name: canary-release-visualization-pattern
description: Canvas particle traffic flow, SVG polyline metric charts, and timeline phase rendering for canary deployment UIs.
category: design
triggers:
  - canary release visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# canary-release-visualization-pattern

The traffic-flow visualization uses an HTML5 Canvas particle system where each particle represents a request traveling from a load-balancer node to either the stable or canary backend. Particles are color-coded (e.g., #6ee7b7 for stable, #f59e0b for canary) and their spawn ratio follows the current traffic-split percentage. A real-time counter overlay shows requests-per-second hitting each version, and the particle stream width scales proportionally to the weight — giving an immediate visual sense of how much traffic the canary is absorbing. The load-balancer node pulses on each routing decision, and failed requests flash red before fading out, so error-rate spikes are visible without reading numbers.

The rollout-sim panel pairs a horizontal stacked-bar gauge (stable % vs canary %) with an SVG polyline chart tracking error rate, p99 latency, and success rate over simulated time ticks. The key pattern is dual-axis rendering: the left Y-axis maps error rate (0–10%) while the right Y-axis maps latency (0–500ms), and a shaded "safe zone" rectangle marks the promotion thresholds. When a metric breaches the threshold, the polyline shifts to a red stroke and the gauge animation pauses — visually encoding the automatic rollback trigger. Tooltips on each data point show the exact simulated values.

The timeline view renders canary lifecycle phases (deploy → warm-up → observe → promote/rollback) as a horizontal swim-lane with CSS-animated progress segments. Each phase block is color-coded by status: in-progress (#3b82f6), passed (#6ee7b7), failed (#ef4444), and skipped (#6b7280). Elapsed time labels sit below each segment, and a vertical "now" needle sweeps across the timeline during simulation. Phase transitions emit a brief scale-up animation on the receiving block, creating a domino-like visual cascade that communicates progression speed at a glance.
