---
name: kafka-organization-id-record-header
description: Place organizationId (tenant) in the Kafka record header, not only in the payload — downstream consumers route by header before deserializing.
type: api
category: api
source:
  kind: project
  ref: lucida-health@CLAUDE.md
confidence: high
---

**Fact.** Every Kafka record produced in a multi-tenant pipeline must include `organizationId` as a record header:

```java
new ProducerRecord<>(
    topic, null, System.currentTimeMillis(), null, message,
    List.of(new RecordHeader("organizationId", orgId.getBytes(StandardCharsets.UTF_8)))
);
```

**Why.** Consumers read headers before Avro deserialization — so routing, tenant-context propagation (see skill `tenant-per-database-mongo-routing`), and dead-letter tagging can happen even when the payload fails to deserialize. Payload-only tenancy means a schema mismatch blackholes records and the DLQ has no way to know which tenant's data was lost.

**How to apply.**
- Producer side: never `new ProducerRecord(topic, value)` shortcut; always build the header list. Wrap in a helper to avoid forgetting.
- Consumer side: extract `organizationId` from headers first, set `TenantContextHolder`, *then* deserialize. Use `ErrorHandlingDeserializer` — on deserialization error, route to DLQ **with the header preserved**.
- Tests should assert header presence, not just payload content.

**Counter / Caveats.** Header values are raw bytes; always specify charset on both ends. Don't duplicate tenant into both header and payload and let them drift — pick header as canonical, remove from payload if possible. Kafka Streams and some connectors drop headers silently on repartition — verify your topology preserves them.
