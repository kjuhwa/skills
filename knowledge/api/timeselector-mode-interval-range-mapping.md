---
name: timeselector-mode-interval-range-mapping
version: 0.1.0-draft
tags: [api, timeselector, mode, interval, range, mapping]
category: api
summary: Clients send a `mode` enum (RAW..YEAR); the server maps it to a (bin-interval, query-range) pair and picks the right pre-aggregated collection
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# TimeSelector `mode` is a (interval, range) mapping

## Fact

The Multi-Metric time-period API accepts `mode` and internally looks up:

| mode     | bin interval | query range |
|----------|--------------|-------------|
| RAW      | raw          | 1h          |
| MIN_30   | 1m           | 30m         |
| HOUR     | 1m           | 1h          |
| HOUR_3   | 1m           | 3h          |
| NOW      | 1m           | 6h          |
| TODAY    | 5m           | 24h         |
| DAY_3    | 5m           | 3d          |
| WEEK     | 1h           | 7d          |
| MONTH    | 1h           | 30d         |
| MONTH_3  | 24h          | 90d         |
| MONTH_6  | 24h          | 180d        |
| YEAR     | 24h          | 365d        |

Clients do **not** specify which MongoDB collection (minute/hour/day view) to read from; that is a server-side consequence of the mode.

## Why

The mode encodes a validated combination: too-fine intervals over too-wide ranges would explode point count on the wire, and too-coarse intervals over short ranges would collapse the series to a single bar. Centralising the mapping eliminates malformed chart requests and lets the server switch the underlying storage (e.g. raw → minute view) without breaking clients.

## How to apply

- New chart types should add a new `mode` entry rather than exposing `intervalMs` + `range` as free parameters.
- `startTime`/`endTime` with value `0` are sentinels — server substitutes the `mode`'s range.
- `intervalMode` (0=auto, 1=1m, 2=5m, 3=1h, 4=1d) is an **override** for advanced users; auto should be the default for UI callers.
- When changing a row in this table, coordinate with the UI team — chart axis labels and tick counts assume these intervals.

## Evidence

- `docs/multi-metric-time-period-api.md`.
- `dto/timeseries/MultiMetricMeasurementRequestDto` and the `TimeSelector` enum.
