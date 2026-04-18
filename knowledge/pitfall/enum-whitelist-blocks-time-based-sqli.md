---
version: 0.1.0-draft
name: enum-whitelist-blocks-time-based-sqli
description: Validate user-supplied identifiers (metric aliases, column names, value-type keys) against a known definition/enum before they reach any query builder — string-only sinks are still injectable
category: pitfall
source:
  kind: project
  ref: lucida-performance@a71d4cc
tags: [security, sql-injection, mongodb, validation, zap]
confidence: high
---

# Fact
Time-based SQL-injection (flagged by OWASP ZAP against an endpoint that builds a Mongo
aggregation from user-supplied metric aliases) is **not** fixed by escaping or by
"we use MongoDB, we're safe". The fix is: reject any alias / value-type / field name
that is not present in the authoritative definition catalog *before* it is composed
into a query.

**Why:** Query builders (Spring Data Criteria, aggregation `Document`s) happily accept
arbitrary strings as field names or enum keys. A supplied name like
`U'+sleep(5)+'` does not hit SQL — but a crafted name can manipulate regex evaluation,
`$where`, or an `expr` stage, or simply trigger an expensive full-collection scan that
looks like a time-based payload. Commits `a71d4cc`, `b30373b`, `a149e0d` (issue
`#111680`) added a "definition integrity check at chart-query time" specifically to
reject aliases not defined in `MeasurementDefinition`.

**How to apply:** At the *entry* of any query-building service, load the allow-list
(enum values, definition catalog), and reject unknowns with a 400 before any Criteria
builder sees them. Do it in the service layer, not the controller — same allow-list
is reused by batch / scheduled paths.

# Counter / Caveats
- Allow-list enforcement only works if the catalog is kept in sync. See the sibling
  pitfall `unit-enum-silent-filter` — if a new unit is added upstream but the enum is
  not, the new metric silently disappears instead of failing loudly. Decide, per
  field: reject unknown (safety) or widen the enum (completeness). Don't do both.
- Logging the rejected value is fine; echoing it in the error body back to the caller
  is not (gives the attacker a free oracle).
