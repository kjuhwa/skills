# Tenant-Aware @EnableAsync

## Problem
`@EnableAsync` by default runs methods on a pool whose threads don't carry the caller's tenant context. Downstream code that reads MDC, a `TenantContextHolder` ThreadLocal, or `RequestContextHolder` sees "no tenant" and either crashes or (worse) silently operates against the wrong tenant.

## Pattern
Create a `@Configuration` that both:
1. Is annotated `@EnableAsync` (NOT the `@SpringBootApplication` class — placement matters).
2. Extends or implements an `AsyncConfigurer` that wraps every submitted task with a decorator snapshotting and restoring the tenant context.

## Steps
1. `@Configuration @EnableAsync public class ThreadPoolConfig extends TenantAsyncConfigurerSupport { ... }` (or implement `AsyncConfigurer` directly).
2. Override `getAsyncExecutor()` to return a `ThreadPoolTaskExecutor` with a `TaskDecorator` that:
   - Captures `MDC.getCopyOfContextMap()` + your tenant ThreadLocal on the submitting thread.
   - Wraps the `Runnable`: on the pool thread, re-applies MDC and tenant, runs, then clears.
3. Size `corePoolSize`/`maxPoolSize`/`queueCapacity` based on workload — avoid unbounded queue.
4. Name threads (e.g. `setThreadNamePrefix("async-tenant-")`) so logs and thread dumps are readable.
5. Expose a scheduled health log reporting pool stats if the pool is load-bearing.

## Why placement matters
`@EnableAsync` at the application class scans globally and can collide with library-provided `AsyncConfigurer` beans. Putting it on a dedicated `@Configuration` that owns the executor bean makes the wiring explicit and testable, and prevents double-registration.

## Anti-patterns
- Using the default `SimpleAsyncTaskExecutor` — no pool, one thread per call.
- Setting the decorator on the pool but forgetting to apply it on the `TaskScheduler` (for `@Scheduled`) — scheduled tasks then lose context.
- Swallowing exceptions in the decorator `try` block instead of `try/finally` — the first failed task silently leaves a dirty ThreadLocal for the next.

## Generalize
Any cross-thread context propagation: MDC (logging), tenant, security `SecurityContextHolder`, tracing span, DataSource routing. Same decorator shape; just capture more fields.
