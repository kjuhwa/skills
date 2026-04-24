---
name: effect-ts-rpc-metrics-and-instrumentation
description: Add observability to RPC handlers with duration, error rates, and distributed tracing using effect/Metric
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [observability, metrics, effect-ts, rpc]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/observability
  - apps/server/src/git/Layers/GitCore.ts
  - docs/observability.md
---

## When to Apply
- You expose RPC methods (WebSocket, HTTP) backed by Effect services
- You want to measure duration, error rates, and throughput per method
- You need distributed tracing to correlate requests across services
- You're emitting metrics to Prometheus, CloudWatch, or similar

## Steps
1. Define metrics in an observability module: `Effect.metric.counter('requests.total')`, `histogram('duration.ms')`
2. Create instrumentation wrapper: `observeRpcEffect(methodName, effect) => Effect` that:
   - Starts a span with method name and input params
   - Runs effect
   - Records duration, error, and success metrics
   - Adds trace attributes (user, env, etc.)
3. For streaming RPC, use `observeRpcStream()` to emit progress metrics
4. Wrap all handler entry points at the transport boundary (before business logic)
5. Use `withMetrics` combinator to attach metrics to effect
6. Export metrics in JSON or Prometheus format on `/metrics` endpoint

## Example
```typescript
const orchestrationDispatchDuration = Effect.metric.histogram('orchestration.dispatch.duration_ms')
const orchestrationDispatchErrors = Effect.metric.counter('orchestration.dispatch.errors.total')

const observeDispatch = (cmd, effect) =>
  Effect.gen(function*() {
    const start = Date.now()
    try {
      const result = yield* effect
      yield* orchestrationDispatchDuration.timeTo(Date.now() - start)
      return result
    } catch (e) {
      yield* orchestrationDispatchErrors.increment()
      throw e
    }
  })

// In RPC handler:
const result = yield* observeDispatch(command,
  orchestration.dispatch(command)
)
```

## Counter / Caveats
- Metric recording can add latency; batch or sample high-frequency metrics
- Cardinality explosion: avoid labels with unbounded values (user IDs, file paths)
- Traces grow in size; implement sampling or capping for high-volume services
- Effect.metric is not the same as external observability SDK; still need exporter (Prometheus, OTEL)
