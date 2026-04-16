---
name: chaos-engineering-visualization-pattern
description: Reusable visual encoding for fault injection, blast radius propagation, and service health state across chaos engineering UIs.
category: design
triggers:
  - chaos engineering visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# chaos-engineering-visualization-pattern

Chaos engineering visualizations share a three-state health model (healthy/degraded/down) mapped to a consistent color triad: green (#6ee7b7) for healthy, amber (#fbbf24) for degraded/warning, and red (#f87171) for failure. This palette appears across all three apps — as node stroke colors in the blast radius graph, card border-left accents in the monkey dashboard, and timeline dot markers in the gameday view. The pattern demands that every visual element carrying service state uses this exact triad without introducing a fourth state, keeping operator cognitive load minimal during high-stress incident simulations.

Layout follows a topology-to-timeline progression depending on the chaos question being asked. Blast radius analysis uses a radial force-directed graph where the injection target sits at the center and dependency edges glow red as failures cascade outward — click-to-inject interaction lets operators explore "what if" scenarios. Real-time monitoring (monkey dashboard) uses a card grid where each service is a self-contained tile showing latency, throughput, and error count with the border color shifting as thresholds are crossed, paired with a monospace event log scrolling newest-first. Temporal exercise tracking (gameday timeline) uses a vertical left-bordered timeline with phase-typed markers (inject → observe → recover → verify), each phase getting its own color from an extended palette that adds indigo (#818cf8) for verification steps. The timeline prepends events with a fade-in animation to draw the eye to the most recent development.

Dark background (#0f1117) with card surfaces at (#1a1d27) is non-negotiable for operational dashboards — it reduces eye strain during extended gameday sessions, maximizes contrast for the health-state colors, and visually separates from standard business UIs to signal "this is an incident context." Animations are kept functional, not decorative: the shake keyframe on failure cards creates urgency, the fade-in on timeline events draws attention, and the cascade delay (300ms × depth) in blast radius makes propagation paths legible rather than instantaneous.
