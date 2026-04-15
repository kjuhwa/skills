---
name: mongo-timeseries-view-pushdown-broken-8_2_3
category: pitfall
summary: "On MongoDB 8.2.3, aggregations run against a view whose source is a time-series collection lose the timestamp bucket-index push-down — hot queries must target the base collection directly. Retest after server upgrades."
scope: global
source:
  kind: project
  ref: lucida-widget@f0d035d
confidence: medium
tags: [mongodb, time-series, view, aggregation, version-specific]
---

# MongoDB 8.2.3: Aggregations through a view over a time-series collection lose timestamp push-down

## Fact
On MongoDB 8.2.3, running an aggregation against a **view** whose source is a time-series collection does not carry through the optimizer's timestamp push-down to the underlying buckets. The view pipeline is applied, but `control.min/max.timestamp` bounds are not synthesized.

## Why
Observed behavior: the view rewrite step and the time-series bucket-index rewrite step don't compose in this version. Querying the base collection directly retains push-down.

## How to apply
- For hot time-series queries, target the **base collection** directly, not the view.
- Keep views for read convenience / ad-hoc queries where latency is not critical.
- Re-test after MongoDB upgrades — this may be fixed in a later version.

## Counter / Caveats
- Confidence medium: issue confirmed on 8.2.3 with one project's workload; verify on your data + version.
- Hour/day granular views worked acceptably in one case and not another — test both ways.

## Evidence
- Commits `f0d035d`, `5dd8aa4`, `0bb4992`, `f1ae259` — successive toggles in lucida-widget ending with "직접 조회로 변경".
