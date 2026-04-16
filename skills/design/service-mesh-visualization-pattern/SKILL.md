---
name: service-mesh-visualization-pattern
description: Render service mesh topology as an interactive node-edge graph with sidecar proxies as decorators around service nodes
category: design
triggers:
  - service mesh visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# service-mesh-visualization-pattern

Service mesh visualizations should distinguish three logical layers in a single canvas: the **service node** (application container), the **sidecar proxy** (Envoy/Linkerd-proxy ring drawn concentrically around the node), and the **control plane** edges (dashed lines from Istiod/control-plane to each proxy). Use a force-directed layout (d3-force or react-flow) for the data plane and overlay control-plane connections in a muted color so users can toggle them. Each edge should encode at least three signals visually: line thickness for RPS, color for success rate (green→amber→red), and animated dash-flow direction for request flow.

For traffic-visualizer apps, render mTLS state as a small lock badge on each edge and circuit state (closed/open/half-open) as a colored ring on the sidecar. For policy-simulator apps, overlay AuthorizationPolicy and PeerAuthentication scopes as translucent regions (namespace-bounded rectangles) so users see which policies apply to which workloads. For circuit-breaker apps, animate the state transitions with a clear timeline scrubber rather than only showing the current state — the value is in seeing *when* trips occurred relative to error spikes.

Always include a side panel that shows the YAML manifest (VirtualService, DestinationRule, AuthorizationPolicy) for the selected node or edge. The visualization is the discovery surface; the YAML is the source of truth users will copy to apply changes. Keep them bidirectionally selectable.
