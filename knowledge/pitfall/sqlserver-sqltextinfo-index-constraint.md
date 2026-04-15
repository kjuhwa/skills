---
name: sqlserver-sqltextinfo-index-constraint
description: Do not put a unique index on sqlHash for SQL Server text-info collection — duplicates are legitimate
category: pitfall
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# sqlHash is not unique on SQL Server text-info

**Fact.** SQL Server's `query_hash` (and the derived `sqlHash` used here) is not collision-free across databases or plan recompiles within the monitored window. A unique index on `SQLServerSQLTextInfo.sqlHash` caused duplicate-key errors and silently dropped inserts, which then created the same orphan-row pattern as the session-history case.

**Why:** `query_hash` is a 64-bit fingerprint for grouping similar queries, explicitly documented as non-unique. Treating it as a primary key is a category error — unique by construction (auto-id or `(db, sqlHash, collectedAt)`) is required; `sqlHash` alone is not.

**How to apply.**
- Never put a unique constraint on a hash-style identifier unless the upstream system documents it as collision-resistant (e.g. SHA-256 of full text).
- For SQL-text lookups, make the composite key `(dbms, dbId, sqlHash)` at minimum; add `planHash` when available.
- If you need an "upsert by hash" operation, do it on the composite key, not the bare hash.

**Evidence.**
- `git log`: `2b7f1973 SQL Server SQLServerSQLTextInfo에서 sqlHash 인덱스 제거`.
