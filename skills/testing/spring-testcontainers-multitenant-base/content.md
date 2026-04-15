# Notes

Source: `lucida-meta` `TestSupport` + `BaseTest` under `src/test/java/com/nkia/lucida/meta/`.

- `BaseTest` adds `@MockitoBean AuditKafkaProducer` — the audit producer is invoked from AOP interceptors on every service call, so leaving it real floods tests with Kafka traffic.
- Gradle `test` task sets `TESTCONTAINERS_REUSE_ENABLE=false` so developers without `~/.testcontainers.properties` get deterministic cleanup.
- Experimental tests go under `src/test/**/temp/**`, excluded via `testExclusionPatterns` in build.gradle — keep CI green while iterating.
