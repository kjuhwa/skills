---
version: 0.1.0-draft
tags: [arch, gradle, avro, plugin, config]
name: gradle-avro-plugin-config
category: arch
summary: davidmc24 avro-gradle-plugin config — createSetters=false + fieldVisibility=PRIVATE enforces immutable generated event schemas
source:
  kind: project
  ref: lucida-audit@65ff568
  path: build.gradle:373-376
confidence: medium
---

# Fact

```groovy
avro {
    createSetters = false
    fieldVisibility = "PRIVATE"
}
```

# Why

- **`createSetters = false`** — Avro-generated POJOs are treated as events/messages. Mutation would break event-sourcing invariants and confuse consumers about "who owns this data". Use the Avro builder pattern instead.
- **`fieldVisibility = PRIVATE`** — forces access through accessors, letting Avro reshape the internal representation (e.g. switch to flyweight) without breaking callers.
- Generated classes are excluded from Jacoco/Sonar (`**/avro/**` in exclusionPatterns) — coverage of auto-generated code is noise.

# How to apply

When bootstrapping another service that produces Avro events to the same Kafka topics:

1. Apply the same plugin and config to keep generated class shapes consistent across producers/consumers.
2. Register `src/main/avro/*.avsc` — default source dir.
3. If you need mutable DTOs, convert Avro records to a separate domain model class; never flip `createSetters=true` just for convenience.

# Counter / Caveats

- `createSetters=false` breaks frameworks that expect JavaBean-style mutation (some legacy ORMs, old Jackson configs without `@JsonCreator` support). Ensure your serializers handle builder-style construction.
