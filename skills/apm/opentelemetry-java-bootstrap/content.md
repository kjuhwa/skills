# OpenTelemetry Java Bootstrap

## Problem

Teams adopting OTEL for Java hit the same cluster of issues:
- Spans "exist" in code but never reach the collector.
- `service.name` shows as `unknown_service:java` in the backend.
- Shutdown drops the last minute of spans.
- Mixing auto-instrumentation agent with programmatic SDK setup causes duplicated or missing spans.

## Pattern

### Choose one path, not both

- **Auto-instrumentation agent** (zero code): download `opentelemetry-javaagent.jar`, pass `-javaagent:path/to/agent.jar`. Configures via env vars / system properties. Best for existing apps.
- **Programmatic SDK**: explicit `OpenTelemetrySdk.builder()...`. Best for new apps or fine-grained control.

Do **not** combine them unless you know the agent's programmatic API — the agent already installs a global SDK.

### Required environment variables (agent mode)

```
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=prod
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc   # or http/protobuf on port 4318
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
```

### Programmatic SDK skeleton

```java
Resource resource = Resource.getDefault()
    .merge(Resource.builder()
        .put(ServiceAttributes.SERVICE_NAME, "my-service")
        .put(ServiceAttributes.SERVICE_VERSION, "1.0.0")
        .build());

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .build()).build())
    .setResource(resource)
    .build();

OpenTelemetry otel = OpenTelemetrySdk.builder()
    .setTracerProvider(tracerProvider)
    .setPropagators(ContextPropagators.create(W3CTraceContextPropagator.getInstance()))
    .buildAndRegisterGlobal();

Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    tracerProvider.shutdown().join(10, TimeUnit.SECONDS);
}));
```

The shutdown hook is non-optional — without it, `BatchSpanProcessor` drops its in-memory queue on JVM exit.

## "Spans silently dropping" checklist

Run through in order:
1. **Endpoint reachable?** `curl -v http://collector:4317` — network errors are the #1 cause.
2. **Protocol matches port?** gRPC=4317, HTTP=4318. Mismatched = silent drop.
3. **Exporter set?** `OTEL_TRACES_EXPORTER=otlp` (default is `otlp` in recent versions, but explicit is safer).
4. **Sampler not zero?** `OTEL_TRACES_SAMPLER=always_on` for debugging (never in prod).
5. **Logs in stderr?** Agent logs to stderr — check for `OkHttpGrpcExporter` or `BatchSpanProcessor` errors.
6. **Shutdown hook present?** Short-lived JVMs lose the last batch without it.
7. **Resource attributes set?** Missing `service.name` can cause backends to bucket spans into a hidden namespace.

## When to Use

- Adding OTEL to a Java service for the first time.
- Debugging why spans appear in code but not in the collector/backend.
- Migrating from Zipkin/Jaeger clients to OTLP.

## Pitfalls

- **`buildAndRegisterGlobal()` called twice**: second call is a no-op, silently. Log at startup to confirm.
- **Custom `Tracer` obtained before global SDK registered**: returns a no-op tracer. Obtain tracers via `GlobalOpenTelemetry.getTracer(...)` *after* SDK registration.
- **Ignoring `OTEL_JAVAAGENT_DEBUG=true`** when troubleshooting the agent — this env var surfaces the silent failures.
- **Thread-pool context loss**: OTEL context doesn't propagate across `Executor.submit` automatically. Use `Context.current().wrap(runnable)` or the agent's `@WithSpan`-aware executors.
- **Double sampling**: parent-based sampler upstream + always-on locally causes confusion. Decide sampling policy at one layer.
