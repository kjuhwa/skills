---
name: period-interval-naming-convention
version: 0.1.0-draft
tags: [domain, period, interval, naming, convention]
slug: period-interval-naming-convention
category: domain
summary: Period.Mode names encode both unit and multiplier (MIN_15, MONTH_2); monthly modes densify at 24h, not the unit itself
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - period-mode-enum-config
---

# Fact
`Period.Mode` constants follow `<UNIT>[_<N>]` where N is the multiplier (e.g. `MIN_15` = 15-minute bucket, `HOUR_3` = 3-hour, `MONTH_2` = 2-month). Special cases:
- `REAL` and `RAW` are both raw data but carry different retention/format semantics — do not collapse them.
- Monthly modes use a 24-hour densify step, not monthly; a monthly densify would leave charts with 2 points per quarter.
- `MIN_15` and `MONTH_2` were added later (`393b82d` / `678efff` / `5b9217f`) as the UI demanded additional granularities; the `Period.Mode` enum is the single source of truth.

# Evidence
- Commit `393b82d` (#118133) — "Period.Mode에 MONTH_2 enum 상수 추가"
- Commit `5b9217f` (#117606) — "MeasurementIntervalType 추가"
- Commit `678efff` (#112113) — "ADD: Period MIN_15 enum 추가 … performance 및 apm 도메인 동기화"
- `build.gradle` references Period across layers; the enum is load-bearing.

# How to apply
- When adding a new Mode, mirror the change into the apm domain simultaneously (commit `678efff` note about domain sync).
- Chart formatters must key off Mode, not off raw interval milliseconds — two modes can share an interval but need different formats.

# Counter / Caveats
- Enums persisted as strings; renames become migrations. Prefer adding new modes over renaming.
