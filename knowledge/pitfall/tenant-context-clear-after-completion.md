---
category: pitfall
summary: Multi-tenant thread-locals must be cleared in a HandlerInterceptor `afterCompletion`, regardless of request outcome
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# Clear TenantContextHolder in afterCompletion, every time

## Fact

`TWebInterceptor.preHandle` resolves the tenant (Bearer token or query param) and sets it on `TenantContextHolder.INSTANCE`. `afterCompletion` unconditionally calls `TenantContextHolder.INSTANCE.clear()` — even on exception paths.

## Why

Servlet containers (Tomcat, Undertow) reuse worker threads from a pool. If a request sets a `ThreadLocal` tenant and does not clear it, the *next* request served by the same thread inherits it — a cross-tenant data leak with no stack trace. The incident that motivated this: an earlier commit removed the clear call (`1832fe7 TenantContextHolder.INSTANCE.clear() 호출 제거`) and it had to be put back.

## How to apply

- Any new `ThreadLocal` storing tenant/user/auth scope **must** be cleared in the same interceptor's `afterCompletion`.
- `afterCompletion` runs even if `preHandle` or the handler threw — do not put the clear in `postHandle`.
- Integration tests should assert that after a request returning 500, the thread-local is null before the next request runs.
- When introducing async/reactive flows, the ThreadLocal pattern is unsafe — switch to `Context` propagation.

## Evidence

- `config/TWebInterceptor.java` — `preHandle` sets, `afterCompletion` clears.
- Commit `1832fe7` ("TenantContextHolder.INSTANCE.clear() 호출 제거") shows the regression that required restoring the clear.
