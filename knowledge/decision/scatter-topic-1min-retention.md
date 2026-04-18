---
version: 0.1.0-draft
tags: [decision, scatter, topic, 1min, retention]
name: scatter-topic-1min-retention
description: Per-tenant scatter-plot/summary topics use 60s retention; metric-history topics use the cluster default. Class-of-data drives retention, not tenant.
category: decision
confidence: high
source:
  kind: project
  ref: lucida-realtime@336a1e2
---

# Scatter Topics = 60s Retention

## Fact
In lucida-realtime, `COMMON_SCATTER.{orgId}` topics are created with `retention.ms = 60000`. Metric-history topics use the cluster default (much longer). The retention rule lives with the topic class, not per-tenant.

## Why
Scatter points are ephemeral — they exist to drive the live view. Once a client fetches the current window, older points are useless. Storing them longer wastes broker disk with no consumer.

Metric history is materialized elsewhere (long-term store) and the Kafka topic is primarily a fan-out bus, so retention only needs to cover consumer lag, not analytics windowing.

## Evidence
- `OrganizationInitServiceImpl` hardcodes retention to `60000ms` on scatter topic creation.
- Commit `fc6d0e9`: "scatter 토픽은 1분만 기본 설정" (scatter topics default to 1 min).

## How to apply
When modeling per-tenant topics, separate classes by data lifetime:
- Ephemeral fan-out (live-view feed) → short retention, small segment sizes.
- Durable history → rely on default, or materialize to a long-term store.

Do NOT pick retention per-tenant. Pick it per-class. Per-tenant variance → ops nightmare.

## Counter / Caveats
- 60s assumes consumers are rarely >60s behind. If GC pause or network partition pushes lag past 60s, messages are lost. Acceptable for live view; not for audit.
- Changing retention later requires an admin-client `alterConfigs` — don't assume initial creation is the only moment retention is set.
