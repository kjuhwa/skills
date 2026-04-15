# Reactor Subscription Router with Backpressure

## Problem
A real-time server subscribes many WebSocket clients to Kafka-fed feeds. A single slow client can back up into upstream Kafka consumption, stalling every other subscriber. Unbounded buffering OOMs the JVM.

## Pattern
One `Disposable` per (sessionId, destination). Each subscription is a Flux with a bounded buffer and a drop-oldest (or drop-latest) overflow strategy. All Disposables are tracked in a concurrent map; `SessionDisconnectEvent` triggers bulk cleanup.

## Steps
1. Key = `sessionId + "|" + destination`. Store in `ConcurrentHashMap<String, Disposable>`.
2. On SUBSCRIBE: build a `Flux` from the upstream source, apply
   - `.onBackpressureBuffer(capacity, onDropped, BufferOverflowStrategy.DROP_LATEST)`
   - `.publishOn(Schedulers.boundedElastic(), prefetch)` to decouple producer and consumer threads
   - a `.filter(...)` that drops rows not matching the subscription key (route rule mismatch)
   - `.doOnNext(row -> messagingTemplate.convertAndSendToUser(...))` to emit to the STOMP user destination
3. Call `.subscribe()` and store the resulting `Disposable`.
4. On UNSUBSCRIBE: remove + dispose.
5. On `SessionDisconnectEvent`: scan the map by sessionId prefix, dispose all.

## Why this shape
- `DROP_LATEST` with a capacity (e.g. 10_000) means a slow client drops its own data, not the upstream's.
- `boundedElastic` prevents a stuck client from pinning a Netty event-loop thread.
- Per-subscription Disposable makes UNSUBSCRIBE O(1) and DISCONNECT cleanup deterministic.
- Logging drops with a counter (not a log line per drop) preserves signal during storms.

## Anti-patterns
- Single shared Flux with multiple downstream subscribers filtering by session — one slow subscriber backs up all.
- Unbounded `.onBackpressureBuffer()` — OOM under disconnect storms.
- Relying on GC to clean up subscriptions when a session dies — Disposable leak is invisible until the heap dump.

## Generalize
Any fan-out of a high-rate upstream (Kafka, Redis pub/sub, MQTT, CDC) to many stateful subscribers (WebSocket, SSE). The router shape does not depend on Spring or STOMP — only on a Reactor source and a per-subscriber sink.
