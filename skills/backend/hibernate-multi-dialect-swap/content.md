# Hibernate Multi-Dialect Swap via Spring Profile

## When to use
A single deployable must connect to any of several RDBMS vendors chosen per-customer/per-env, without changing code.

## Steps
1. Ship all JDBC drivers as `runtime` dependencies in build (postgres, ojdbc, sqljdbc, jtds, tibero, db2jcc, mariadb).
2. Externalize `hibernate.dialect`, `hibernate.connection.driver_class`, `hibernate.connection.url`, `username`, `password` into `config.properties`.
3. Activate env via `-Dspring.profiles.active=<profile>` (production/development/test); profile selects which `config.properties` ships or overlays.
4. Register custom dialects where vendor SQL diverges (e.g., `PostgreSQLDialect` subclass, `SQLServerUnicodeDialect`, `Tibero5Dialect`).
5. For scheduler (Quartz) set `org.quartz.jobStore.driverDelegateClass` to match the active DB.
6. Tomcat JDBC pool: set per-DB `validationQuery` (e.g., `SELECT 1` / `SELECT 1 FROM DUAL`).
7. On connection init, log `SELECT version()` / dialect banner to confirm the right profile was picked.

## Watch out for
- Date/time format strings are not portable — use lowercase `yyyy` (see `hibernate-date-format-lowercase`).
- Reserved words differ per vendor; prefer quoted identifiers only when needed.
- Bind parameter limits differ (e.g., MSSQL 2100) — pair with `chunked-resource-id-batch-fetch`.
