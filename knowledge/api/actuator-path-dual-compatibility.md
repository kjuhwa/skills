---
version: 0.1.0-draft
tags: [api, actuator, path, dual, compatibility]
name: actuator-path-dual-compatibility
category: api
summary: Actuator endpoints must respond at both /actuator/** and /actuator/{appName}/** for deployment compatibility.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Actuator: Both Prefixed and Unprefixed Paths

**Fact.** Health/metrics endpoints respond at `/actuator/health` AND `/actuator/{appName}/health`. Both paths are excluded from JWT/auth interceptors (#113317, #114073).

**Why.** SaaS deployment hits unprefixed paths; on-prem reverse-proxy routes include the app name in the URL. The same binary must serve both without configuration branching.

**How to apply.** When adding a new security interceptor, exclude BOTH path patterns. When adding a new actuator-like endpoint (custom health check, readiness probe), mirror the dual-path convention. Monitoring dashboards must be tolerant to either form — never hardcode one.
