# Spring Boot Dual-Profile (H2 Dev / PostgreSQL Prod) with Flyway

## Problem

Local dev should boot in under 5 seconds with no external DB, but production schema changes must be versioned and replayable. Two traps:

- **"H2 in dev, Postgres in prod"** without Flyway leads to silent schema drift — dev works, prod migration fails.
- **Relying on `ddl-auto: update`** in dev means your local schema is whatever Hibernate guessed last time, not what you've committed.

## Pattern

1. **Flyway is the single source of truth** for DDL. Every schema change goes into `src/main/resources/db/migration/V<N>__<desc>.sql`.
2. **`ddl-auto: validate`** in every profile. If the Java `@Entity` model drifts from the Flyway-built schema, startup fails — you catch it locally, not in prod.
3. **H2 in file mode** (not in-memory) for dev, so data survives restarts. Enable the H2 console for ad-hoc queries.
4. **Postgres for prod** via env-injected datasource URL — never commit prod credentials.
5. **Profile activation**: `spring.profiles.active: dev` as the default in `application.yml`; production sets `SPRING_PROFILES_ACTIVE=prod` in the environment.

H2 vs Postgres SQL compatibility: write migrations in **standard SQL** or Postgres dialect; run them against H2 with `MODE=PostgreSQL` to catch most incompatibilities locally.

## Example (sanitized)

```yaml
# src/main/resources/application.yml
spring:
  profiles:
    active: dev
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: true
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
```

```yaml
# src/main/resources/application-dev.yml
spring:
  datasource:
    url: jdbc:h2:file:./data/appdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    username: sa
    password: ""
    driver-class-name: org.h2.Driver
  h2:
    console:
      enabled: true
      path: /h2-console
  jpa:
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
  sql:
    init:
      mode: never  # let Flyway own it
logging.level.org.hibernate.SQL: DEBUG
```

```yaml
# src/main/resources/application-prod.yml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
  h2:
    console:
      enabled: false
```

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("com.h2database:h2")
    runtimeOnly("org.postgresql:postgresql")
    // Flyway 10+ needs the dialect plugin for Postgres:
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
}
```

```sql
-- src/main/resources/db/migration/V1__init.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Run:
```bash
# dev (default profile)
./gradlew bootRun

# prod
SPRING_PROFILES_ACTIVE=prod DATABASE_URL=jdbc:postgresql://... ./gradlew bootRun
```

## When to use

- Any Spring Boot service with a real DB.
- Teams where "works on my machine" is a recurring DB issue.
- Projects where schema changes are frequent and must be auditable.

## When NOT to use

- Prototype spikes where you'll throw away the DB — `ddl-auto: create-drop` is fine there.
- Pure read-only services against an externally managed DB — Flyway just gets in the way.

## Pitfalls

- **`BIGSERIAL` in H2**: H2 understands it only with `MODE=PostgreSQL`. Without that mode flag, the migration fails locally while passing code review.
- **Flyway 10 + Postgres**: requires the `flyway-database-postgresql` module as a separate dep — missing it gives a cryptic "no database found" error.
- **`ddl-auto: update` in dev "just to iterate faster"**: you'll lose drift protection and your first prod deploy will surprise you. Resist it.
- **Checksums**: once a migration is applied, editing it changes its checksum and Flyway refuses to start. Create a new `V<N+1>__` file instead.
- **Dev data wipe**: H2 file mode persists under `./data/`. `.gitignore` it; also document how to reset (`rm -rf data/` before restart).
- **Baseline existing DBs**: moving an existing prod DB onto Flyway requires `baseline-on-migrate: true` plus a `V1__baseline.sql` that matches current state — don't skip this.
