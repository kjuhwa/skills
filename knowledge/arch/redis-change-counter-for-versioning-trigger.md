---
name: redis-change-counter-for-versioning-trigger
category: arch
summary: |
  For "auto-snapshot on N edits OR every T minutes" versioning, use two Redis keys per entity
  (change_count, last_version_time) rather than scanning the DB. Trigger a snapshot when count
  reaches threshold AND min-interval has elapsed; reset both on snapshot.
source:
  kind: project
  ref: lucida-snote
---

# Arch: Redis-backed change counter for "idle or max-interval" auto-versioning

## Fact
The auto-versioning trigger in lucida-snote is driven by two Redis keys per entity:

```
{prefix}:change_count:{entityId}       INCR on every mutation, TTL = minIntervalMinutes * 2
{prefix}:last_version_time:{entityId}  set to now() when a snapshot is written
```

A new snapshot is created when **both** conditions hold:
1. `change_count >= minChangeCount` (default 3)
2. `now - last_version_time >= minIntervalMinutes` (default 5)

On snapshot: delete `change_count`, write `last_version_time = now`.

## Why
An earlier iteration triggered on a fixed change count alone (e.g. "every 30 edits"). That produced either too many snapshots for fast typists or too few for slow drafters, and in collaborative editing the counter jumped by many per-second during concurrent typing bursts. Moving to "change count AND elapsed time" and storing both in Redis (rather than scanning page history) gave stable snapshot cadence with bounded write amplification and sub-millisecond overhead per edit.

The TTL on `change_count` (`2× minIntervalMinutes`) auto-resets the counter for abandoned edits so a paused draft doesn't get a spurious version hours later.

## How to apply
- When designing "snapshot-every-N-or-every-T" triggers, store both counters in a fast K/V (Redis) rather than the primary DB — mutation-path latency matters.
- Name keys with a stable prefix so they're easy to scan during incidents: `{domain}:change_count:...`, `{domain}:last_version_time:...`.
- Put a TTL on the counter key so ghost counters don't accumulate for entities that stop being edited.
- Increment from every write path that the user perceives as "an edit" — for hierarchical data (page + blocks), walk to the root entity and increment there, not on the child.
- Reset atomically on snapshot. A race where the counter is decremented-then-incremented between check and snapshot is acceptable; a race where the snapshot happens twice is not — guard with a SETNX on a short-lived lock key if concurrent writers can both trigger.
