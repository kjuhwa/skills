---
name: compare-counts-exclude-added-deleted
version: 0.1.0-draft
tags: [pitfall, compare, counts, exclude, added, deleted]
title: Configuration-change counts must include newly-added resources, not just "latest" rows
category: pitfall
summary: An earlier query filtered change-count by `latest` / `added` / `deleted` flags, which silently dropped newly-added resources from the "number of changes between two points in time" metric.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  commits:
    - af86fcce
    - 12e887b2
    - e9998b79
    - 1106339e
    - 457fb4f8
confidence: high
---

## Fact

Configuration change-history count between two timestamps originally excluded rows flagged `added` or `deleted`, returning an undercount when resources were newly introduced in the window. Fix: drop `latest`/`added` conditions from the count query and include newly-added resources in `compareResources`.

## Why

The `added`/`deleted`/`latest` flags were designed to model a resource's lifecycle state, not to filter the "what changed in window W" report. Reusing them for counting conflates two concerns.

## How to apply

- When computing "changes in window" metrics on an append-only history collection, count all rows whose event-time falls in the window, regardless of lifecycle flags.
- Keep lifecycle flags for list/diff views, not for count/history aggregations.
- When reviewing any query that filters by `latest = true`, verify it's a "show me current state" query, not a "what happened" query.

## Counter / caveats

- If a later product decision is "count only modifications, not creations", the fix swings the other way — read the requirement before copying the pattern.
