---
name: api-versioning-implementation-pitfall
description: Common failure modes when building API version tracking dashboards — stale state, misleading compatibility, and migration blind spots.
category: pitfall
tags:
  - api
  - auto-loop
---

# api-versioning-implementation-pitfall

The compatibility matrix app regenerates random data on every page load via `genMatrix()`, meaning the compatibility status of any endpoint-version pair is non-deterministic. In a real system this creates a dangerous illusion: a developer might check the matrix, see `GET /orders` as compatible with v3.0, plan their migration around that assumption, then reload and see it flagged as breaking. The fix is to persist the compatibility matrix as a derived artifact from actual API schema diffs (OpenAPI spec comparisons, protobuf field tracking) rather than generating it at render time. The random tooltip selection (`notes.breaking[Math.floor(Math.random()*notes.breaking.length)]`) compounds this — the same cell shows different breaking-change descriptions on each hover, eroding trust in the tool.

The drift monitor hardcodes consumer-to-version mappings and traffic percentages, but real API versioning drift is a moving target where the same consumer can send mixed-version traffic (e.g., a mobile app sending v3 requests from cached code while the latest binary uses v4). The flat "migrated: 72%" metric hides whether that consumer is stably at 72% or oscillating — a common pitfall when API gateway logs show version headers but don't distinguish between intentional dual-version usage and incomplete rollouts. Without a time dimension on per-consumer migration, teams make premature sunset decisions that break lagging clients.

The timeline app's lifecycle model uses a simple three-state enum (active/deprecated/sunset), but real API versioning has intermediate states that cause outages when missed: "deprecated but under active security patching," "sunset but with a contractual SLA extension for one partner," or "active but feature-frozen." Collapsing these into three buckets leads to sunset announcements that violate partner contracts, or deprecated versions silently accumulating new consumers because the dashboard shows them as still reachable. The endpoint count per version (e.g., v4 has 14 endpoints) also hides endpoint-level deprecation — an endpoint can be sunset within an otherwise active version, and this per-version granularity misses that entirely.
