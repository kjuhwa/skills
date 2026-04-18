---
version: 0.1.0-draft
name: user-sql-source-requires-select-only-and-readonly
category: pitfall
summary: "When a feature lets end-users paste raw SQL for display, no single guard is enough — layer four defenses: SELECT-only keyword allow-list, token-aware destructive-keyword blocklist, JDBC `setReadOnly(true)`, and `setQueryTimeout` + `setMaxRows` caps."
scope: global
source:
  kind: project
  ref: lucida-widget@a4eb540
confidence: medium
tags: [security, jdbc, user-input, data-source]
---

# User-supplied SQL data sources: defense in depth (SELECT-only + readOnly + timeout + maxRows)

## Fact
When a widget/report feature lets end-users paste a SQL query for display, a single guard is not enough. The project layered four defenses:
1. Keyword allow-list: first token must be `SELECT`.
2. Blocklist: reject if query contains any of `INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, GRANT, REVOKE, EXEC, EXECUTE` (token-aware, not substring).
3. `connection.setReadOnly(true)` on every JDBC connection.
4. `PreparedStatement.setQueryTimeout(...)` + `setMaxRows(...)` with hard caps (e.g. 60s / 10k rows).

## Why
- Keyword filtering alone is defeatable (comments, stacked statements, stored-proc calls).
- `setReadOnly` enforcement happens driver-side and blocks writes even if the parser is bypassed.
- Timeout + row cap turns a malicious/expensive query into a bounded failure, not a DoS.

## How to apply
- Combine all four; don't treat any as sufficient alone.
- Use dedicated read-only DB credentials where possible — defenses become belt-and-suspenders.
- Encrypt stored credentials at rest (AES-256 in this project); mask on read-back; on update, null input means "keep existing".
- For MongoDB variants, apply analogous caps (`.limit`, read-only URI, no `$where`/`mapReduce`).

## Counter / Caveats
- Blocklist is not exhaustive (e.g. `MERGE`, `CALL`, DCL in some dialects) — maintain per-dialect.
- `setReadOnly` semantics vary by driver; test on each supported DB.

## Evidence
- `docs/GUIDE_CUSTOM_TABLE_IMPL.md` §6 security; commits around `#118572` (custom table widget).
