---
version: 0.1.0-draft
tags: [pitfall, sql, hash, unsigned, integer]
name: sql-hash-unsigned-integer
description: MySQL/MariaDB SQL digest hashes fit in an unsigned 32-bit range but arrive as signed Java int — negatives are legal and must not be dropped
category: pitfall
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# SQL Hash can be negative — don't filter it out

**Fact.** MySQL/MariaDB `DIGEST` / Performance Schema `SQL_ID`-style hashes are unsigned 32-bit values. When read into a Java `int` they can come back negative. Early code treated negative as "invalid" and skipped the row, which silently dropped session history for any SQL whose hash happened to land in the upper half of the range.

**Why:** unsigned → signed wrap-around is undefined at the domain layer unless you explicitly promote to `long` or `String`. A `hash < 0 ? null : hash` check will corrupt ~50% of session history over time.

**How to apply.**
- Store SQL hashes as `Long` (widen) or as `String` (hex) — never as `int`.
- If `int` is forced by an external API, keep the signed value and treat negative as valid; only filter on actual null.
- When auditing a collector that correlates session history to SQL text by hash, check the "missing SQL text for N sessions" metric — if it's ~50%, suspect sign filtering.

**Evidence.**
- `git log`: `fe9af2bb #117829 MySQL, MariaDB SQL Hash 음수인것 저장안되는 오류 수정`
- related fixes: `99d309f6`, `586c2244`, `1ab4e72b` (session history sqlHash/queryTime null handling).
