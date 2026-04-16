---
name: strangler-fig-visualization-pattern
description: Canvas and SVG rendering patterns for visualizing incremental legacy-to-modern system migration with route-percentage overlays and dependency decay timelines.
category: design
triggers:
  - strangler fig visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# strangler-fig-visualization-pattern

The strangler-fig visualization pattern renders a dual-system topology where a legacy monolith is progressively encased by modern service nodes — mirroring how a strangler fig vine envelops its host tree. The core layout places the legacy system as a central shrinking node surrounded by an expanding ring of microservice replacements. Each route or API endpoint is drawn as a directed edge from an ingress proxy to either the legacy or modern target, with edge color interpolating from red (100% legacy) through amber to green (100% modern). An animated "traffic flow" particle stream along each edge conveys real request volume, and the proxy node itself renders a pie-chart glyph showing the current global split ratio. As migration progresses, the legacy node visually shrinks (radius proportional to remaining un-migrated surface area) while replacement nodes grow, giving an immediate at-a-glance sense of migration completeness.

A time-series strip beneath the topology shows a stacked area chart of legacy vs. modern traffic share over configurable windows (hour, day, sprint). Critical to the strangler-fig domain is a "dependency decay" heat-map sidebar: rows represent legacy modules, columns represent sprints, and cell color intensity encodes remaining inbound call count. This lets teams spot modules that refuse to die — the visualization equivalent of a root that hasn't been cut. Rollback events are marked as red vertical bands on the timeline, annotated with the route that reverted, so the team can correlate regressions with specific migration steps.

For interactivity, hovering a service node highlights all routes it owns plus the legacy endpoints it replaced, and clicking a route opens a detail panel with latency comparison (legacy p99 vs. modern p99), error-rate delta, and a toggle to simulate flipping the route percentage. The entire visualization updates via SSE or WebSocket so it can serve as a live war-room dashboard during cutover windows. Canvas is preferred for the particle traffic animation (60 fps on 100+ concurrent routes), while SVG is used for the topology labels and the heat-map sidebar where crisp text and DOM event handling matter more than frame rate.
