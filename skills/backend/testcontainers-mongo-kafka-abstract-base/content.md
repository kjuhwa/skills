# Testcontainers Abstract Base (Mongo + Kafka)

## Shape
One abstract class per external dependency, each managing a static singleton container. Test classes extend the one(s) they need; containers start once per JVM and survive across test classes (`withReuse(true)`).

```java
public abstract class KafkaTestContainer {
  static final KafkaContainer KAFKA =
    new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"))
        .withReuse(true);
  static {
    KAFKA.start();
    System.setProperty("kafka.bootstrap", KAFKA.getBootstrapServers());
  }
}
```

## Why static + setProperty
Spring's `@DynamicPropertySource` is cleaner but fires per test class; static + `System.setProperty` sets the value *before* Spring context load on first access, and the `withReuse` contract means subsequent test classes reuse the same container without re-publishing properties.

## Steps
1. Enable `~/.testcontainers.properties` with `testcontainers.reuse.enable=true` on dev machines.
2. One abstract base per service: `KafkaTestContainer`, `MongoDBTestContainerConfig`.
3. Integration test class: `extends KafkaTestContainer implements MongoBacked`. Don't double-inherit — compose via interfaces with default methods or one aggregate base.
4. Pin image versions (`cp-kafka:7.6.1`, `mongo:latest` only for local sandbox — pin for CI).

## Counter / Caveats
- `withReuse(true)` is IGNORED in CI unless the CI runner also sets the property. In CI, each job gets a fresh container — that's fine, just expect slower cold starts.
- Don't mix `@Testcontainers`/`@Container` lifecycle with the static pattern — pick one. This project picks static because of `reuse`.
- H2 is still used for pure repository unit tests (`testImplementation 'com.h2database:h2'`); keep that split explicit.
