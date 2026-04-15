# Local dev via Gradle `bootRun` env block

## Goal

`./gradlew bootRun` should start the service against locally-running infra (docker compose or similar) **without** any IDE-specific run configuration, and **without** committing a `application-local.yaml`.

## Shape

```groovy
tasks.named("bootRun", org.springframework.boot.gradle.tasks.run.BootRun) {
    jvmArgs = [
        "-agentlib:jdwp=transport=dt_socket,server=y,address=8001,suspend=n",
        "-Xms4096m", "-Xmx4096m",
        "--add-opens", "java.base/java.net=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
    ]
    def ip = "127.0.0.1"
    environment "SPRING_PROFILES_ACTIVE", "local"
    environment "MONGODB_URI",             "mongodb://${ip}:27017/?w=1"
    environment "KAFKA_CLUSTER_BOOTSTRAP", "${ip}:19092"
    environment "SCHEMA_REGISTRY_URL",     "http://${ip}:8081"
    environment "REDIS_HOST", ip;          environment "REDIS_PORT", "6379"
    environment "MQTT_URI",                "tcp://${ip}:1883"
    // Eureka off locally — otherwise the app spams register attempts
    environment "EUREKA_CLIENT_ENABLED",         "false"
    environment "EUREKA_REGISTER_WITH_EUREKA",   "false"
    environment "EUREKA_FETCH_REGISTRY",         "false"
}
```

## Rules

- Keep `application-local.yaml` in `.gitignore` — the env block is the source of truth.
- Always disable Eureka client locally; the three `EUREKA_*` flags are all required (enabling registration alone still causes fetch failures).
- Debug on **8001** (or a project-specific port) so multiple services can run in parallel.
- `--add-opens` block silences reflection warnings on JDK 17+ for libraries that still use setAccessible on `java.net` / `java.lang`.
- Keep passwords/secrets as `System.getenv()` lookups with a dev-only default — never hardcode production secrets.

## When to extend

- Add a `if (project.hasProperty('prof')) { environment "SPRING_PROFILES_ACTIVE", prof }` override so `-Pprof=integ` is possible.
- For multiple services, factor the common block into `gradle/bootRun-local.gradle` and `apply from:` it.
