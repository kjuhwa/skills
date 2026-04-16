---
name: api-gateway-pattern-implementation-pitfall
description: Common mistakes when building gateway routing, filter chains, and config-driven pipelines
category: pitfall
tags:
  - api
  - auto-loop
---

# api-gateway-pattern-implementation-pitfall

The most frequent failure is treating filter order as a configuration detail instead of a contract. Authentication must run before rate-limiting (otherwise unauthenticated traffic burns quota for the wrong tenant), rate-limiting must run before expensive transforms (otherwise rejected requests still pay CPU cost), and logging/tracing wrappers must bracket the entire chain rather than sit inside it (otherwise rejected-at-auth requests vanish from traces). Config builders that let users drag filters into arbitrary order without validating these invariants will silently ship broken gateways.

Route matching pitfalls cluster around predicate ambiguity: two routes both matching `/api/**` with different filter chains will be resolved by registration order, not by specificity, in most simple gateway implementations. The simulator/builder must surface the resolved order explicitly and warn on overlap. Also watch for greedy path predicates that swallow `OPTIONS` preflight requests intended for a CORS filter on a different route — preflight handling needs an explicit higher-priority route, not assumed CORS middleware.

On the runtime side, circuit breakers configured per-route but sharing a single backend pool create false safety: each route sees its own healthy stats while the shared pool is saturated. Bind breaker state to the downstream pool, not the inbound route. And never retry non-idempotent verbs (POST/PATCH/DELETE) at the gateway by default — the original service may have already committed the side effect, and the gateway has no way to know.
