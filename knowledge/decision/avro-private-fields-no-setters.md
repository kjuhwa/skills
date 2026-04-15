---
category: decision
summary: Avro-generated classes are configured with `fieldVisibility=PRIVATE` and `createSetters=false` to enforce immutability on event payloads
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# Avro codegen: private fields, no setters

## Fact

```groovy
avro {
    createSetters = false
    fieldVisibility = "PRIVATE"
}
```

Set in `build.gradle` for the `com.github.davidmc24.gradle.plugin.avro` plugin.

## Why

Kafka/Avro payloads are shared across producer and consumer services. Mutability after deserialization leads to hard-to-trace bugs where one consumer mutates a field, then downstream code in the same JVM receives the mutated value (because the message is passed by reference). Forcing constructor-only initialization also matches the schema-evolution contract: you cannot "half-update" a record in-flight.

## How to apply

- Keep the two flags on. If a consumer "needs" a setter, it actually needs a new derived DTO, not a mutation on the Avro class.
- Use the generated `Builder` for test fixtures.
- Do not add `@JsonIgnore` / Jackson setter workarounds — if JSON representation is needed, define a separate DTO.
- When upgrading the plugin version, re-verify these flags remain honored (plugin defaults have flipped across versions).

## Evidence

- `build.gradle:375-378`.
