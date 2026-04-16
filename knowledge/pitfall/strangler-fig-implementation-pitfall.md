---
name: strangler-fig-implementation-pitfall
description: Common failure modes in strangler-fig migrations including shared-state coupling, split-brain routing, and premature legacy decommission.
category: pitfall
tags:
  - strangler
  - auto-loop
---

# strangler-fig-implementation-pitfall

The most dangerous pitfall in a strangler-fig migration is shared mutable state between the legacy and modern systems. When a legacy monolith stores session data, counters, or transactional state in a shared database and the new service also writes to the same tables, you get split-brain inconsistencies that neither system detects. A request routed to the modern service may write a v2 schema row that the legacy system cannot parse when it handles the next request for the same entity. The fix is to treat the data layer migration as a separate axis from the routing migration: either the legacy owns writes and the modern service reads via CDC/event stream, or you introduce an anti-corruption layer that translates between schemas — but never allow both systems to write to the same table concurrently without a coordination protocol.

The second pitfall is "zombie routes" — endpoints that appear fully migrated (100% traffic to modern) but still receive occasional requests through internal legacy-to-legacy calls that bypass the ingress proxy. This happens when the legacy monolith makes direct in-process function calls to the module you thought was fully strangled. These calls never hit the proxy routing layer, so your traffic metrics show 0% legacy while actual legacy code is still executing. The remedy is to instrument the legacy module itself with a call counter and alert when it fires after the route is supposedly fully cut over. Only decommission legacy code when both the proxy metric and the in-process counter read zero for a full cycle.

The third failure mode is premature legacy decommission driven by schedule pressure. Teams see 95% of routes migrated and declare victory, shutting down the legacy system. But the remaining 5% often handles edge-case paths — error recovery, batch reconciliation, admin overrides — that are called rarely but are critical when they fire. The strangler-fig pattern specifically demands that the legacy host stays alive until every last root is severed, not just the visible trunk. A safe decommission gate requires: zero traffic on all routes for N consecutive days, zero in-process calls, all dependent batch jobs migrated, and a shadow-mode period where the legacy runs but is not reachable from production ingress, catching any DNS or service-discovery stragglers that still resolve to the old address.
