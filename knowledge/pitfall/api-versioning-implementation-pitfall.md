---
name: api-versioning-implementation-pitfall
description: Common failure modes in API version lifecycle management, drift detection, and negotiation strategy selection.
category: pitfall
tags:
  - api
  - auto-loop
---

# api-versioning-implementation-pitfall

**Sunset without consumer tracking leads to silent breakage.** The most dangerous pitfall is sunsetting a version (marking it unavailable) while consumers still depend on it. The timeline app models this correctly — v2.0 and v1.0 show 0 consumers before reaching sunset status. In practice, teams skip the consumer-count check and sunset by calendar date alone. The fix is to gate sunset transitions on a drift monitor that confirms zero active traffic for N consecutive periods, not just a deprecation notice date. Without this, partners running batch jobs on deprecated versions (like the "Legacy Batch" client pinned to v1 in the drift simulator) get 404s with no warning.

**Drift health thresholds that ignore client importance create false confidence.** The drift monitor uses a simple percentage (>70% on latest = healthy), but this treats all clients equally. If "Partner A" on v2 generates 60% of revenue but only 5% of request volume, the dashboard shows green while the most critical integration runs on a deprecated version. A production-grade drift monitor must weight by client tier or revenue attribution, not just request count. The same applies to breaking-change flags — the timeline tracks them per version but doesn't cross-reference which consumers are affected.

**Mixed negotiation strategies cause routing ambiguity.** The negotiator supports four strategies (URL path, header, Accept, query param), but real API gateways receive requests using multiple strategies simultaneously — a client might send both `X-API-Version: 2` and hit `/v3/users`. The negotiator doesn't define precedence rules for conflicts, which is exactly where production incidents occur. The fix is to enforce a single canonical strategy per API and reject requests with conflicting version signals (returning 400 with a clear error), rather than silently picking one. Additionally, the `Accept` header strategy (`application/vnd.api.v3+json`) is the most standards-compliant but the hardest to debug because version information is buried in a media type string that load balancers and CDNs may not parse.
