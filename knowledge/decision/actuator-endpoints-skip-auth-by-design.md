---
name: actuator-endpoints-skip-auth-by-design
description: In a monitoring collector, target-level BASIC/BEARER auth is stored but intentionally NOT applied when calling /actuator/health and /actuator/metrics.
type: decision
category: decision
source:
  kind: project
  ref: lucida-health@582e643
confidence: high
---

**Fact.** The `HealthTarget.authConfig` (BASIC/BEARER) is persisted but the HTTP client **does not** apply it to `/actuator/health` or `/actuator/metrics/**` calls. Auth is reserved for future non-actuator endpoints.

**Why.** Actuator endpoints are expected to be publicly reachable from the monitoring plane; adding auth-per-target multiplies ops complexity and creates rotating-secret load for no security benefit inside the trusted monitoring network. Security is enforced at network level (firewall / LAN-only exposure), not per-request.

**How to apply.** When you see stored credentials that "look unused" in an Actuator collector, do **not** wire them into the call path as a cleanup — that would break the deployment contract. Apply auth only for non-actuator custom endpoints (e.g. `/actuator/command` when it's secured separately). Document this at the HTTP client layer so the next maintainer doesn't "fix" it.

**Counter / Caveats.** This only holds when the monitoring plane and targets share a trusted network. On multi-tenant SaaS with targets over public internet, this decision must be revisited — auth stored per target then becomes load-bearing.
