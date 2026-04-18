---
version: 0.1.0-draft
name: tenant-context-per-request-interceptor
title: Per-request tenant context via HandlerInterceptor
description: Extract tenant id from JWT/header in preHandle, store in ThreadLocal, clear in afterCompletion to isolate multi-tenant data access
type: knowledge
category: arch
confidence: high
source:
  kind: project
  ref: lucida-topology@8729ca3
tags: [multi-tenancy, thread-local, spring-mvc, interceptor, mongodb]
---

# Per-request tenant context via HandlerInterceptor

## Fact
Multi-tenant isolation is implemented by setting a `ThreadLocal` tenant id at request entry
(`HandlerInterceptor.preHandle`) and clearing it at request exit (`afterCompletion`). Downstream
DAO / repository layers read the ThreadLocal to scope queries (e.g. pick the right Mongo
collection/database). The same ThreadLocal is also populated at Kafka message consumption
using a header value (`organizationId`) before the repository call, then cleared.

## Shape
- Extract tenant id from a trusted source: `Authorization: Bearer <jwt>` → claim, fall back to
  a request parameter for legacy callers.
- If neither exists and the request is not a CORS preflight (`OPTIONS`), reject with an auth error.
- `TenantContextHolder.INSTANCE.setTenantId(...)` in `preHandle`, `.clear()` in `afterCompletion`.
- For async / Kafka paths that do not flow through the web interceptor, set/clear the ThreadLocal
  around the unit of work; also propagate it across thread-pool boundaries via
  `AsyncConfigurer` that copies context into the submitted task.

## Evidence
- `src/main/java/com/nkia/lucida/topology/config/TWebInterceptor.java` — preHandle/afterCompletion pair.
- `src/main/java/com/nkia/lucida/topology/kafka/MeasurementConsumer.java` — set/clear around each save.
- `CLAUDE.md` — "Multi-Tenancy Pattern" section describes the flow end-to-end.

## Counter / Caveats
- ThreadLocal leaks between requests if `afterCompletion` does not run (e.g. a filter earlier in
  the chain short-circuits the response). Prefer try/finally or a servlet `Filter` if exceptions
  can bypass the interceptor.
- Works only inside the request thread. Any manual `@Async`, `CompletableFuture`, or reactive
  hop must explicitly propagate the tenant id; otherwise queries silently fall back to default
  tenant or throw.
- ThreadLocal-based isolation is a runtime guard, not a compile-time one — a bug that forgets to
  set the context will often still return *some* data (the default tenant), masking the defect.
