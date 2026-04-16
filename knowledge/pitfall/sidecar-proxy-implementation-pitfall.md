---
name: sidecar-proxy-implementation-pitfall
description: Common modeling errors that make sidecar-proxy demos technically wrong despite looking correct
category: pitfall
tags:
  - sidecar
  - auto-loop
---

# sidecar-proxy-implementation-pitfall

The most frequent pitfall is collapsing the sidecar into a single "proxy" box and drawing arrows app→proxy→network, which erases the defining property of a sidecar: traffic is intercepted transparently via iptables/TPROXY redirection, so the app believes it is calling the destination directly. Visualizations must show the app's logical arrow (to the remote service) and the actual physical path (through the local sidecar) as two layers, otherwise viewers leave thinking sidecars are explicit proxies the app calls — which is the mental model of an API gateway, not a sidecar.

Second pitfall: simulating policy enforcement at the wrong hop. RBAC/AuthZ runs on the server-side sidecar (inbound listener of the destination pod), not the client-side sidecar. Many demos incorrectly deny at the source, which hides the real failure signature — a 403 with RBAC: access denied in the destination's access log and a UAEX response flag. Similarly, mTLS termination happens between the two sidecars, so the destination app always sees plaintext HTTP on 127.0.0.1; showing encrypted traffic reaching the app is wrong.

Third pitfall: treating proxy-added latency as a constant. Real Envoy overhead is dominated by filter chain depth and cold xDS config pushes, not a flat "add 2ms". When config churns (e.g. during a canary rollout), p99 spikes come from RDS/CDS update storms, not from the data path itself. Latency-scope apps that model proxy cost as constant miss the single most important operational signal and will mislead users debugging real meshes.
