# Avro-on-Kafka with Gradle codegen + Schema Registry

## Wire-up

```gradle
plugins {
  id "com.github.davidmc24.gradle.plugin.avro" version "1.9.1"
}

repositories {
  maven { url = uri("https://packages.confluent.io/maven") }
}

avro {
  createSetters = false        // immutable generated classes
  fieldVisibility = "PRIVATE"  // force getter access
}
```

`.avsc` files under `src/main/avro/**` → generated classes on the classpath before `compileJava`.

## Kafka producer config (Spring)

```yaml
spring.kafka.producer:
  key-serializer:   org.apache.kafka.common.serialization.StringSerializer
  value-serializer: io.confluent.kafka.serializers.KafkaAvroSerializer
  properties:
    schema.registry.url: ${SCHEMA_REGISTRY_URL}
    auto.register.schemas: false      # CI registers them; runtime should not
    use.latest.version: true
```

## Gotchas
- `createSetters = false` means generated classes are builder-only. Callers that expect POJOs with setters break — plan the migration.
- Version compatibility is **Registry-enforced**. Default compatibility is `BACKWARD`: new consumers can read old messages, not vice versa. If you rename a field, it’s a breaking change; use aliases.
- Don’t commit generated sources — the plugin regenerates on each build. Exclude `build/generated-main-avro-java/**` from Sonar/coverage.
- `auto.register.schemas=false` in prod. Turning it on lets any producer silently evolve the schema.

## Counter / Caveats
- For JSON-first consumers, Protobuf + Schema Registry gives similar guarantees with broader tooling.
- For fewer than ~5 message types, plain JSON + versioned topics is simpler than Avro plumbing.
