---
version: 0.1.0-draft
name: health-check-implementation-pitfall
description: Common failure modes when building health-check systems: self-check blind spots, probe-induced load, and stale-cache green lies
category: pitfall
tags:
  - health
  - auto-loop
---

# health-check-implementation-pitfall

The most dangerous failure in a health-check system is the health-check itself lying green. This happens three predictable ways. First, **self-check blind spot**: the `/health` endpoint returns 200 because the HTTP server is up, but doesn't actually touch the database, cache, or downstream dependencies it claims to cover — so a service with a dead DB reports healthy until a real request arrives. Fix by making `/health` execute a real (cheap, read-only) query against each declared dependency, and returning a per-dependency breakdown, not a single boolean.

Second, **probe-induced load / probe amplification**: aggressive intervals (every 1s from every monitor instance) can themselves take down the service being checked, especially when the check is expensive (full DB query, TLS handshake, DNS resolution with no cache). Mitigate with jittered intervals, probe-side caching of recent results with a short TTL, and a circuit-breaker on the probe so a struggling target gets probed *less* frequently, not more. Never let N monitor replicas each probe independently without coordination.

Third, **stale-cache green lies**: a probe that caches "last known good" and serves it when the check itself fails will report healthy forever after the dependency dies. Cache results only for a bounded TTL shorter than the alerting window, and treat "probe itself errored" as `unknown` (gray) — never as the previous value. In the visualization, distinguish "last check succeeded N seconds ago" from "last check was N seconds ago"; a frozen timestamp on a green card is the tell that the probe itself has stopped running.
