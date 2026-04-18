---
version: 0.1.0-draft
name: trace-context-async-execution-propagation
summary: Thread-local trace context is lost across executor.submit / reactor.flatMap boundaries; scouter injects bytecode wrappers around async entry points to capture and restore it
category: pitfall
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [async, tracing, pitfall, jvm, scouter]
---

## Fact

Request context (trace ID, user ID, start time) lives in a `ThreadLocal` on the request-handling thread. When work is offloaded to a thread pool, reactive pipeline, or `CompletableFuture`, the ThreadLocal is not automatically carried — downstream steps see an empty context and record "orphan" segments that don't connect to the parent XLog. Scouter handles this by instrumenting `ExecutorService.submit`, Reactor `flatMap` / `Mono.fromCallable`, and similar entry points via ASM to wrap Runnables/Callables with context-capturing delegates. This is a pervasive APM pitfall: OpenTelemetry standardizes it via Context Propagators; competitors (Datadog, NewRelic) each ship their own wrapper sets.

## Evidence

- `scouter.agent.java/src/main/java/scouter/agent/trace/TraceContext.java`
- `scouter.agent.java/src/main/java/scouter/agent/asm/asyncsupport/AsyncContextDispatchASM.java`
- `scouter.agent.java/src/main/java/scouter/agent/asm/asyncsupport/executor/ExecutorServiceASM.java`

## How to apply

If you're writing JVM instrumentation, your first pass will trace the sync path cleanly and produce ghost segments on async. Budget time for async propagation hooks — list all executor and reactive entry points in your target stack, write wrappers for each, test with an async-heavy demo app (Spring WebFlux, Reactor, Kotlin coroutines). Treat missing async propagation as a tier-0 bug, not a feature flag.
