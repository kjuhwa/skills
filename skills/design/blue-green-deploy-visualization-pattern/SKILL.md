---
name: blue-green-deploy-visualization-pattern
description: Three complementary visual encodings for blue-green deployment state — dual-environment panels, particle-based traffic flow, and timeline cards.
category: design
triggers:
  - blue green deploy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# blue-green-deploy-visualization-pattern

All three apps share a consistent dark-themed visual language (`#0f1117` background, `#1a1d27` card surfaces, monospace font) with a strict two-color semantic: `#60a5fa` for blue environments and `#34d399` for green environments. These colors are never decorative — they always encode which environment a piece of data belongs to. The accent color `#6ee7b7` is reserved for system-level chrome (headings, active borders, router indicators, button fills) to separate "deployment infrastructure" from "environment identity." This three-color discipline prevents ambiguity when both environments are visible simultaneously.

The apps demonstrate three distinct visual encoding strategies for the same domain. The **simulator** uses a dual-panel layout with mirrored canvas charts and animated traffic-percentage bars — the key insight is that the router element sits between the panels as a spatial anchor, and CSS `scaleX(-1)` on the arrow cheaply conveys direction without sprite assets. The **traffic flow** app uses canvas particle animation where each request is a dot moving from a load-balancer node to a target node along dashed guide lines; particle color encodes the destination, and a range slider directly controls the spawn probability split. The **timeline** app uses a vertical left-bordered timeline with `::before` pseudo-element dots colored by environment, plus status tags using background/foreground color pairs (`#1a2e25`/`#34d399` for success, `#2e1a1a`/`#f87171` for failure, `#2e2a1a`/`#fbbf24` for rollback) — a reusable three-state deploy outcome palette.

A reusable pattern emerges: pair a **macro view** (which environment is active, what percentage of traffic goes where) with a **micro view** (individual request particles, per-deploy cards, real-time RPS charts). The macro view uses large UI controls (buttons, sliders, status text) while the micro view uses animated or scrollable detail regions. This dual-resolution approach lets operators grasp the current state at a glance while drilling into specifics without switching screens.
