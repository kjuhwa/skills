---
name: postgres-version-rolling-support
version: 0.1.0-draft
tags: [decision, postgres, version, rolling, support]
category: decision
summary: Roll PostgreSQL major-version support forward incrementally (9.x → 18) rather than pinning one LTS
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: high
---

# PostgreSQL Version Rolling Support

## Fact
Cygnus adds PostgreSQL major-version support (14, 15, 16, 17, 18) incrementally as each ships, rather than pinning one version. Custom `PostgreSQLDialect` subclasses handle per-version SQL divergence.

## Why
Enterprise customers run whatever PostgreSQL version their DBA team approved. Refusing a version loses the deal; silently misbehaving on a new version causes incidents (see `hibernate-date-format-lowercase`).

## How to apply
- When a new major PostgreSQL release ships, open a ticket to validate collection/history queries and extend the dialect.
- Do not assume new versions are backward-compatible on date-format functions, `information_schema` shape, or TopSQL views.
- Detect version via `SELECT version()` at connection init; log it so ops can confirm which dialect is live.

## Evidence
- PG18 support, PG17 support, PG 14/15/16 TopSQL query additions (sequential commits over multiple releases).
