---
name: chaos-engineering-implementation-pitfall
description: Common failure modes when building chaos engineering simulation tools — unbounded cascades, unrealistic recovery, and missing phase discipline.
category: pitfall
tags:
  - chaos
  - auto-loop
---

# chaos-engineering-implementation-pitfall

The most dangerous pitfall in blast radius simulation is unbounded cascade propagation. Without a depth limit, a single node failure in a densely connected service graph visits every reachable node, turning any injection into a total system kill — which is both unrealistic and uninformative. The blast radius app caps propagation at depth 3 and uses bidirectional edges (`nodes[a].deps.push(b); nodes[b].deps.push(a)`), but this bidirectionality is itself a trap: in real architectures, dependencies are directional (API Gateway depends on Auth, not vice versa). Bidirectional edges cause "upstream propagation" where killing a leaf node cascades back to the gateway, which never happens in practice. Production-grade blast radius tools must model directed dependency graphs and distinguish between "X calls Y" (downstream) and "X is called by Y" (upstream) to avoid wildly overstating impact.

A second pitfall is symmetric failure/recovery probability. The monkey dashboard allocates 30% of ticks to recovery actions, but each recovery only partially reverses damage (random subtraction vs. full spike injection). This is a good instinct — but if recovery probability is set equal to or higher than failure probability, the dashboard reaches a boring equilibrium where nothing stays broken long enough to observe compound effects. The flip side is also broken: if recovery is too rare, the dashboard monotonically degrades to all-red within 30 seconds, making extended observation pointless. The sweet spot is ~30-40% recovery rate with partial healing, but the real pitfall is not surfacing the cumulative system-level health — individual card states are shown but there is no aggregate SLO burn-rate or composite score, so operators can't tell if the system as a whole is within tolerance or past the point of no return.

The third pitfall is skipping the hypothesis-verify loop in gameday tooling. The timeline app correctly enforces the inject → observe → recover → verify phase structure, but tools that just replay random events without the bookend hypothesis and verdict steps produce entertainment, not engineering insight. A chaos experiment without a falsifiable hypothesis ("service X recovers within Y seconds") is just breaking things. Equally, tools that show recovery but skip the verification phase ("was there data loss? were SLOs met?") leave the most important question unanswered. The timeline app demonstrates this correctly by ending with an explicit SLA comparison ("failover took 12s, SLA=5s — ACTION REQUIRED"), but many implementations forget this step, turning gameday exercises into impressive demos that generate zero actionable findings.
