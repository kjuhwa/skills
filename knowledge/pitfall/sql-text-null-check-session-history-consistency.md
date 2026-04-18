---
version: 0.1.0-draft
tags: [pitfall, sql, text, null, check, session]
name: sql-text-null-check-session-history-consistency
description: Session history rows must omit sqlHash and queryTime when SQL text is missing, else they orphan in downstream joins
category: pitfall
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# If SQL text is missing, don't persist sqlHash / queryTime either

**Fact.** In the MySQL session history writer, a session row can arrive with no SQL text (target was idle, query just finished, permissions, etc.) but with a non-null `sqlHash` from a stale cache. Persisting `{sessionId, sqlHash, queryTime}` without the text creates a row that will never join back to a `SqlTextInfo` document — dashboards show "unknown SQL spending N ms" forever.

**Why:** session history + SQL text are stored in separate MongoDB collections and joined by hash at query time. Referential integrity has to be enforced at write time; there is no FK to catch it later.

**How to apply.**
- Write the triple `(sqlText, sqlHash, queryTime)` as a unit — if text is null, null out hash and queryTime on the same row.
- Do NOT "fill in" sqlHash from a previous tick's cache unless you also have the text.
- When auditing collectors, watch for the symmetric bug: text present but hash null (hash computation failed) — same atomic-write rule applies.

**Evidence.**
- `git log`: `99d309f6`, `586c2244`, `1ab4e72b`, `e9f1a092` — all #117829 "세션 이력 저장시 SQL Text가 없는 경우 SQL Hash및 queryTime값이 들어가지 않게 수정" across four fix iterations.
