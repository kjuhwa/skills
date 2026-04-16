---
name: blue-green-deploy-visualization-pattern
description: Reusable visual encoding patterns for rendering blue-green deployment state, traffic flow, and history on HTML5 Canvas and DOM.
category: design
triggers:
  - blue green deploy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-visualization-pattern

Blue-green deployment UIs require three complementary visual layers: a **dual-environment status panel**, a **live traffic flow canvas**, and a **deployment timeline**. The status panel renders two side-by-side environment boxes (Blue/Green) with an active/standby toggle — the active environment gets a highlighted border and a real-time RPS sparkline chart drawn via Canvas `lineTo()` over a rolling 50-sample window, while the standby environment shows near-zero baseline noise (`Math.random()*5`). A directional arrow or traffic-fill bar animates the switch in 10% increments (200ms intervals) to give operators a visceral sense of the cutover progressing. Color-code strictly: `#60a5fa` for blue, `#34d399` for green, `#6ee7b7` for neutral infrastructure elements like load balancers.

The traffic flow layer uses a **particle system** where a load-balancer node spawns request particles each tick, routing them probabilistically to Blue or Green targets based on the current split percentage. Each particle interpolates linearly (`t += speed`) from LB coordinates to the target environment's coordinates, colored by destination. Dashed connector lines (`setLineDash([4,4])`) show potential paths while solid animated particles show actual traffic. A slider (0–100%) drives the `bluePct` ratio fed into `Math.random()*100 < bluePct`, giving real-time interactive control. Metrics panels beside each environment show live req/s counts (accumulated per 1s interval) and simulated p99 latency.

The timeline layer renders deployment history as a vertical card list, alternating blue/green markers. Each card displays version, service name, environment tag, status badge (success/failed/rolled-back with distinct colors: green for ok, red for fail, amber for rollback), duration, and timestamp. Click-to-expand reveals author, commit hash, and health-check pass rate (e.g., "3/5 passed" for failures vs "5/5 passed" for success). New deployments prepend to the list. Status distribution in simulated data should mirror realistic ratios — approximately 70% success, 15% rolled-back, 15% failed — to give dashboards a credible visual weight.
