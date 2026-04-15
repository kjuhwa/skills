# bootRun Local Dev Environment Recipe

Configure `bootRun` to launch with every env var the service reads — so `./gradlew bootRun` Just Works against a local infra stack.

## Recipe

```groovy
tasks.named("bootRun", org.springframework.boot.gradle.tasks.run.BootRun) {
    jvmArgs = [
        "-agentlib:jdwp=transport=dt_socket,server=y,address=8001,suspend=n",
        "-Xms4096m", "-Xmx4096m",
        "--add-opens", "java.base/java.net=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED"
    ]

    def localIp = "127.0.0.1"
    environment "SPRING_PROFILES_ACTIVE", "local"
    environment "MONGODB_URI",   "mongodb://${localIp}:27017/?w=1"
    environment "KAFKA_CLUSTER_BOOTSTRAP", "${localIp}:19092"
    environment "SCHEMA_REGISTRY_URL",     "http://${localIp}:8081"
    environment "REDIS_HOST", localIp
    environment "REDIS_PORT", "6379"
    environment "MQTT_URI",   "tcp://${localIp}:1883"
    environment "EUREKA_URL", "http://${localIp}:51200/eureka/"
    environment "QUARTZ_JOB_STORE_CLASS", "org.quartz.simpl.RAMJobStore"
    // ... add every env your application.yml references via ${VAR}
}
```

## Why

- Eliminates per-developer `.env` drift.
- JDWP on 8001 ready for IDE attach.
- `--add-opens` required for Java 17+ with reflection-heavy libraries (Spring, Jackson).
- `RAMJobStore` on Quartz skips JDBC schema bootstrap for local dev.

## Anti-patterns

- Don't hardcode secrets — use Jasypt `ENC(...)` values checked in, or read from OS env with a fallback.
- Don't maintain a separate `application-local.yaml` that shadows env lookups; keep YAML as the single schema and override with env only.
