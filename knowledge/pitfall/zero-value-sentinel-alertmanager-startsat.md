---
version: 0.1.0-draft
name: zero-value-sentinel-alertmanager-startsat
summary: Alertmanager fills the alerts[].startsAt field with "0001-01-01T00:00:00Z" (the Go time.Time zero value) when not populated by the upstream alert source — guard with year < 2000 to detect this and fall back to a sensible default.
category: pitfall
tags: [alertmanager, time-parsing, sentinel, golang]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/nodes/plan_actions/detect_sources.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Pitfall: Alertmanager `startsAt` Zero-Value Sentinel

## The problem
Alertmanager (written in Go) initializes `time.Time` fields to the zero value `"0001-01-01T00:00:00Z"` when the upstream source didn't populate `startsAt`. If you naively compute `now - startsAt`, you get a 2024-year delta, which produces a window of ~1 million minutes — completely useless.

## Detection
After parsing, check `alert_time.year < 2000`. If true, treat the field as missing and fall back to a default window (60 minutes is reasonable for most observability backends).

```python
try:
    alert_time = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
    if alert_time.year < 2000:           # zero-value sentinel
        return 60                         # default window
    minutes_ago = int((datetime.now(UTC) - alert_time).total_seconds() / 60)
    return max(60, minutes_ago + 35)
except (ValueError, TypeError):
    return 60
```

## Where this comes from
- Go's `time.Time` zero value is `January 1, year 1, 00:00:00 UTC`.
- Alertmanager's webhook payload structure (`type Alert struct { StartsAt time.Time ... }`) marshals an unset time as `"0001-01-01T00:00:00Z"` in JSON.
- Same trap appears with EndsAt, when the alert is firing (no end time yet).

## Generalize
Any system that uses Go `time.Time` and JSON-marshals the zero value should be guarded. Consider a shared helper:

```python
def is_zero_time(dt: datetime) -> bool:
    return dt.year < 2000
```

## See also
- Same pattern shows up in Kubernetes Event timestamps when the watch hasn't observed the event creation yet.
- For Prometheus alerts via Alertmanager-compatible webhooks, this is universal.
