---
version: 0.1.0-draft
tags: [domain, mysql, mariadb, performance, schema, detection]
name: mysql-mariadb-performance-schema-detection
description: MySQL/MariaDB metric availability depends on per-instance Performance Schema state; detect at runtime, don't assume
category: domain
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# Performance Schema on/off changes which MySQL/MariaDB metrics exist

**Fact.** `performance_schema` is a runtime toggle on MySQL and MariaDB. When off, queries against `performance_schema.*` return empty or error, and metrics like `events_statements_summary_by_digest` / wait events / stage summaries simply are not there. It is not safe to assume Performance Schema is on just because the version supports it.

**Why:** operators routinely disable P_S on small instances to save memory, and some managed services disable subsets of P_S tables even when the schema is nominally on. A collector that assumes "on" will emit zero-valued metrics (or throw) and both outcomes corrupt dashboards.

**How to apply.**
- On connect, probe `SHOW VARIABLES LIKE 'performance_schema'` (and, if needed, `SELECT ENABLED FROM performance_schema.setup_consumers`).
- Cache the result per target; expose as a capability flag (e.g. `basic-info.performanceSchemaOn`) so downstream layers can branch.
- Split metric definitions into "always available" vs "requires P_S"; skip the latter when the flag is off rather than emitting nulls.
- Re-probe on reconnect — operators flip the setting.

**Evidence.**
- `git log`: `c0758569 MySQL, MariaDB Performance Schema on, off관련 쿼리 수정`, `961e46a2 /basic-info REST API에 MariaDB Performance Schema On여부 리턴되게 수정`.
