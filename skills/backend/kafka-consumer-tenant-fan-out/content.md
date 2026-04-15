# Kafka Consumer Tenant Fan-Out

## Problem
With topic-per-tenant provisioning, a consumer that hardcodes topic names cannot pick up new tenants without restart. Also, when messages arrive, the consumer needs to know which tenant they belong to without parsing the topic name.

## Pattern
- `@KafkaListener(topicPattern = "CLASS\\..*")` auto-discovers new tenant topics.
- Producers set an `organizationId` record header on every produce.
- Consumer reads the header, validates non-null, routes to a per-tenant downstream stream (e.g. Reactor Sink, in-memory map).
- Use an **isolation** container factory (unique groupId per instance, often with a UUID suffix) for "I want every instance to see every message" fan-out semantics; use a shared groupId for "partition the work".

## Steps
1. Define a record header constant, e.g. `X-Organization-Id`.
2. Producers attach the header on every `ProducerRecord`.
3. Consumer method signature: `@Header(ORG_HEADER) String orgId, @Payload AvroType msg, Acknowledgment ack`.
4. Guard: `if (orgId == null) { log.warn + ack.acknowledge(); return; }` — never crash the container on a malformed header, ack-and-drop.
5. Route: `router.route(orgId, msg)` — the router owns per-tenant Sinks/Flux/whatever downstream.
6. Acknowledge after route (not before) so a router exception replays the record.
7. For fan-out semantics, configure a dedicated `ConcurrentKafkaListenerContainerFactory` ("isolation") where `groupId = base + UUID`. For partitioned work semantics, use the default factory with a stable groupId.

## Why this shape
- `topicPattern` is evaluated against broker metadata — new topics auto-join subject to the refresh interval.
- Header-based routing is cheap and avoids regex-parsing topic names.
- "ack-and-drop on malformed" is the right default for routing headers — a poisonous record must not halt fan-out.

## Anti-patterns
- Parsing tenant from the topic name (`topic.split("\\.")[1]`) — brittle, and forces every tenant into one naming convention.
- Shared groupId for fan-out semantics — you'll get load-balanced, not broadcast.
- Unique groupId for partitioned work — you'll get duplicate processing.

## Generalize
Any multi-tenant event-driven system. The same shape works with NATS subjects, Pulsar topics, or RabbitMQ topic exchanges — swap the client, keep the header+router split.
