---
version: 0.1.0-draft
name: service-mesh-implementation-pitfall
description: Common traps when building service mesh tooling: stale config, identity confusion, and sidecar startup races
category: pitfall
tags:
  - service
  - auto-loop
---

# service-mesh-implementation-pitfall

The most pervasive pitfall is conflating the service identity with the sidecar identity. In a real mesh, the SPIFFE ID is bound to the ServiceAccount, not the pod or service name — tools that label edges by Kubernetes service name silently misrepresent authorization failures because AuthorizationPolicy actually matches on `principals` (SPIFFE URI). mesh-policy-composer especially must render the SPIFFE identity prominently; showing only the service name leads users to author policies that "look right" but never match. Always derive identity from ServiceAccount + namespace + trust domain, and validate policy selectors against that triplet.

A second trap is stale config visualization. Control plane push (xDS) is eventually consistent, so a policy added in the UI is not instantly effective at every sidecar — there's a 1–10s propagation window. Tools that show policies as "active" the moment they're composed mislead users during troubleshooting. Model an explicit "pending → pushed → acknowledged" state machine per sidecar and visualize NACKs loudly (red badge on the sidecar), since a rejected xDS config is the #1 reason "my policy isn't working." Similarly, sidecar startup races (app container starts before istio-proxy is ready) drop early traffic — simulate this in sidecar-proxy-playground by showing a ~2s "warming" state after pod start where outbound requests fail with connection refused.

Third, avoid rendering the mesh as a purely logical graph divorced from locality. Real meshes route preferentially to same-zone endpoints via locality-weighted load balancing, and ignoring topology_keys/localityLbSetting hides the dominant latency factor. Include zone/region metadata on nodes and dim cross-zone edges to make locality routing visible — users debugging p99 spikes almost always find the answer in a cross-region hop their tooling wasn't showing.
