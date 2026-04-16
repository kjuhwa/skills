---
name: load-balancer-implementation-pitfall
description: Common bugs in load-balancer simulations — health-check gaps, round-robin drift, and metric display deception
category: pitfall
tags:
  - load
  - auto-loop
---

# load-balancer-implementation-pitfall

The most dangerous pitfall is filtering dead servers without re-indexing the round-robin counter. In the visualizer, `pick()` filters to `alive = servers.filter(s => s.health > 0.3)` then indexes with `rrIndex % alive.length`, but `rrIndex` increments globally. When a server goes unhealthy and the alive array shrinks, the modulo wraps differently, causing the next-in-line server to be skipped or hit twice. The correct fix is to track the round-robin cursor against server IDs, not array positions — or reset the cursor when the alive set changes. This same bug appears in production Nginx upstreams when a node flaps between healthy and unhealthy states, causing uneven distribution that looks correct in dashboards but produces latency spikes on specific backends.

A second pitfall is the drain model masking saturation. The sim drains load with `Math.random() > 0.4` (60% chance per tick), which means average drain rate is constant regardless of current load. Real servers slow their response rate under load (queue buildup, context switching), so a linear drain dramatically understates how quickly least-connections diverges from round-robin under heavy traffic. If you use this simulation to justify an algorithm choice, add a load-dependent drain rate (e.g., `drainChance = 0.6 / (1 + load * 0.05)`) or the comparison will be misleading.

Third, the dashboard's CPU random walk uses an asymmetric bias (`Math.random() - 0.48` instead of `- 0.5`), which causes a slow upward drift in CPU readings over time. This is realistic for a warming server but deceptive if you're using the dashboard to validate alerting thresholds — the drift means every node will eventually hit "critical" regardless of load. Pair this with the health-status derivation being purely CPU-based (ignoring latency and RPS) and you get false alerts on low-traffic nodes that happen to drift high, while genuinely overloaded high-RPS nodes at 70% CPU sit in "healthy." Real dashboards must use composite health scores weighting multiple signals.
