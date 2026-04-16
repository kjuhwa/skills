---
name: sidecar-proxy-visualization-pattern
description: Render sidecar proxies as concentric shells around service pods with animated request/response arrows crossing the proxy boundary
category: design
triggers:
  - sidecar proxy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# sidecar-proxy-visualization-pattern

Sidecar proxy visualizations should structurally separate three layers per workload: the application container (inner filled circle/rectangle), the proxy sidecar (outer ring or adjacent capsule sharing the pod boundary), and the network edge (dashed pod outline). Use a distinct hue for proxy traffic (e.g. teal/cyan for mTLS-wrapped flows) versus raw application calls (gray dashed) so the "transparent interception" property is immediately legible. Every inbound and outbound arrow must visibly enter/exit through the sidecar ring, never the app container directly — this is the core invariant the visualization is teaching.

For multi-pod topologies (flow/policy/latency apps), arrange pods on a horizontal rail or grid with the control plane (xDS/Pilot/Istiod) floating above, connected by thin dotted config-push lines that pulse on config updates. Request animations travel app→local-sidecar→remote-sidecar→remote-app as four discrete segments with per-segment latency labels; policy denials should freeze the arrow at the sidecar ring and flash red with the rule ID that matched. Latency scope views overlay a stacked bar inside each arrow showing the proxy-added overhead (TLS handshake, filter chain, routing) versus network and app time.

Keep the sidecar ring thickness proportional to active filter count or CPU cost so viewers can spot proxy-heavy pods at a glance. Always label the proxy with its role (ingress/egress/both) and expose a hover tooltip listing the active listener/cluster/route IDs, mirroring Envoy admin terminology so the mental model transfers to real debugging.
