---
name: save-child-only-when-changed
version: 0.1.0-draft
tags: [decision, save, child, only, when, changed]
title: Skip child-configuration save unless resourceName or tags actually changed
category: decision
summary: When reconciling parent→child configurations, persistence is conditional on "new" or "resourceName/tags changed". Unconditional save caused unnecessary write load and spurious change events.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  commits:
    - 1faccefa
    - d7f80d4d
    - 30e105b6
confidence: high
---

## Fact

Child-configuration save logic now branches: save only if (a) the child is newly added, OR (b) its `resourceName` changed, OR (c) its `tags` changed. Previously every reconciliation persisted every child.

## Why

Unconditional save on every parent-event fan-out produced:
- Write amplification on Mongo.
- False-positive change events downstream (Kafka consumers, audit, UI change-count), which in turn drove the compare-counts pitfall.

## How to apply

- Any batch reconciliation of child records should compute a minimal diff before writing. A "touch-everything" reducer is a performance AND a correctness hazard when downstream consumers treat every write as a change.
- If you need an audit heartbeat without a real change, emit a distinct event type, don't re-save the row.

## Counter / caveats

- The diff must cover every field that consumers care about. Adding a new field that affects downstream state means extending the change predicate in the same commit.
