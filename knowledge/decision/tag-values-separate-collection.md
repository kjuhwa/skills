---
name: tag-values-separate-collection
version: 0.1.0-draft
tags: [decision, tag, values, separate, collection]
title: Tag value list split into its own collection (tag_value_detail)
category: decision
summary: TagValueInfo's `values` array was extracted from the parent tag document into a separate `tag_value_detail` collection to bound document size and index cost.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  commits:
    - 369d77c5
    - 75a25766
    - 8af2181b
confidence: high
---

## Fact

`TagValueInfo.values` is stored in `tag_value_detail` rather than inline on the tag document.

## Why

Embedded arrays that grow unboundedly in MongoDB hit two problems: single-document size ceiling (16MB) and every update rewrites the whole document. Splitting out the values gives per-value CRUD and bounded parent documents.

## How to apply

- When modeling a 1-to-many in MongoDB, estimate the "many" side's growth. If it can grow unboundedly (user-driven, event-like), split into a separate collection with a backreference, not embedded array.
- When querying tag values, query `tag_value_detail` directly; don't pull the parent + embedded values.
- Migrating embedded → referenced requires a one-time data-patch step (this project uses a `patch` package for such migrations).

## Counter / caveats

- Small, bounded arrays (<100 items, stable) are still better embedded — the split adds a lookup round trip.
