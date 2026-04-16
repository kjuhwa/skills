---
name: load-balancer-visualization-pattern
description: Reusable visual encoding patterns for rendering load balancer topology, server health, and traffic distribution in canvas/DOM UIs.
category: design
triggers:
  - load balancer visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# load-balancer-visualization-pattern

Load balancer visualizations share a three-layer topology layout: a client source on the left, a central LB dispatcher node, and a fan-out to N backend server nodes on the right. The simulator app draws this on a `<canvas>` with animated request particles that travel client→LB→server using linear interpolation (`progress` 0–0.5 for client-to-LB, 0.5–1.0 for LB-to-server). Each server renders as a bar whose fill width is `load/maxLoad`, color-coded with a three-tier threshold palette: green (`#6ee7b7`) below 50%, amber (`#fbbf24`) at 50–80%, and red (`#f87171`) above 80%. This same red/amber/green palette is reused across all three apps for health status cards, bar fills, and border accents — establishing it as the canonical load-balancer health color scale.

The health dashboard shifts from canvas topology to a card-grid + sparkline-chart pattern. Each backend node gets a DOM card showing RPS, latency, health percentage, and uptime — with the card's left-border color driven by the same three-tier threshold. A shared `<canvas>` below draws a 60-second rolling RPS sparkline per node, each in a distinct lane color (`#6ee7b7`, `#60a5fa`, `#fbbf24`, `#a78bfa`, `#fb923c`, `#fb923c`). Grid lines at fixed Y intervals provide scale context without axis labels, keeping the dashboard compact. The algorithm-race app introduces a third pattern: side-by-side horizontal bar lanes, one per algorithm, where each bar represents a server's cumulative load. A live stats line under each lane shows request count, max-server-load, and standard deviation — making the fairness of distribution immediately visible.

Across all three apps, the shared design system is: dark background (`#0f1117`), panel surface (`#1a1d27`), text (`#c9d1d9`), accent green (`#6ee7b7`), border-radius 6–10px, and Segoe UI font stack. Buttons and selects share identical styling — `background: #1a1d27; color: #6ee7b7; border: 1px solid #6ee7b7`. When building any load-balancer UI, reuse this topology→dashboard→comparison visual progression and the three-tier health color scale for immediate user recognition.
