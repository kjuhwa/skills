---
name: cm-maintenance-job-target-snapshot
version: 0.1.0-draft
title: Maintenance job target set is a snapshot — resources added to the group mid-run are NOT covered
category: pitfall
summary: ResourceMaintenanceJob flattens targetGroupIds / targetTagFilters / targetResourceIds into confInfoIds at only two moments — create/modify and trigger start — so resources joining a targeted group during a RUNNING window get no maintenance flag, no alarm auto-delete, and no end-of-window recovery.
source:
  kind: session
  ref: lucida-cm@c9dc78441f1f
confidence: high
tags:
  - maintenance
  - scheduling
  - group-membership
  - snapshot-vs-live
---

## Fact

The CM ResourceMaintenanceJob uses a **snapshot-based** target set. `confInfoIds` — the concrete list of resources the job acts on — is recomputed from `targetConfIds / targetResourceIds / targetGroupIds / targetTagFilters` (and the `excluded*` counterparts) only at two moments:

1. **Create / modify** — `createResourceMaintenanceJob` and `modifyResourceMaintenanceJob` call `findConfInfoIds(...)` to flatten the indirect selectors into `confInfoIds`. (`modifyResourceMaintenanceJob` refuses to run while status is RUNNING, so it cannot be used as a live refresh.)
2. **Trigger fires** — `startSchedule()` re-flattens via `FindConfInfoBySystemTreeService.getAllConfIds(...)`, stores the result via `job.modifyConfInfoIds(...)`, and then flips the maintenance flag ON only for that snapshot using `configurationRepository.updateMaintenanceStatusById(...)`.

Between those points there is no re-evaluation. No Mongo event listener, no Kafka consumer, and no service-side hook watches group / tag / resource membership changes and pushes deltas into running jobs. `ConfigurationGroupCascadeMongoEventListener` only generates ID sequences.

Therefore: if a resource is added to a group while a maintenance job targeting that group is RUNNING, the resource is **not** put into maintenance. It keeps firing alarms, is skipped by `alarmAutoDelete`, is absent from `findChangeableConfInfoIds`, and so is not restored at end-of-window either.

## Why

The design trades live membership for transactional clarity: a job's "what it touched" audit is exactly the snapshot, and start/end flag flips are balanced. Live re-evaluation would need delta logic on every group/tag/resource mutation, plus a way to decide whether a newly-added resource's flag should be reverted at end-of-window even though it was never flipped at the start. That machinery doesn't exist yet.

## How to apply

- When a user reports "I added a server to the maintenance group but it's still alarming during the maintenance window", don't look for a bug in the flag update path — explain the snapshot semantics and point at the next trigger start.
- For repeating triggers: the new resource joins automatically at the next occurrence. For ONCE or `nowStart` triggers, it will never join the current run.
- If live membership really is required, the change lives in `ResourceMaintenanceJobServiceImpl`, not in the group/tag services. The shape of the fix:
  1. On group / tag / resource membership changes, load `jobRepository.findAllByStatus(RUNNING)` filtered by `targetGroupIds` / `targetTagFilters` / `targetResourceIds` that intersect the changed entity.
  2. Re-flatten via `FindConfInfoBySystemTreeService.getAllConfIds(...)` and diff against the stored `confInfoIds`.
  3. For additions: call `updateMaintenanceStatusById(true)` and update `job.modifyConfInfoIds(...)`.
  4. For removals (resource left the group): call `updateMaintenanceStatusById(false)` — but only if the resource is not also covered by another running job's snapshot.
  5. Mirror the same logic for `excludedGroupIds` / `excludedTagFilters` / `excludedResourceIds` (entering an excluded set must flip the flag OFF).
  6. Make sure `endSchedule` / `cancelResourceMaintenanceJob` — which use `findChangeableConfInfoIds` — also restore the newly-joined resources, or the flag stays ON forever.
- Don't "fix" this by re-running `startSchedule` out of band — it re-runs the full start sequence (status transition, notification schedule re-insert, start/complete time recalculation), which is wrong for a mid-run membership delta.

## Counter / caveats

- Snapshot semantics are the right default for maintenance windows that must have a reproducible "what was touched" record (audit, incident post-mortem). Don't flip to live membership globally — expose it as an opt-in per-job flag if you need it.
- The excluded* side is the subtle part of any live-membership patch: a resource entering `excludedGroupIds` during a RUNNING job should turn its maintenance flag OFF even though the job is still running. Forgetting this will leave resources stuck in maintenance.
- `excludedGroupIds` / `excludedResourceIds` carve-outs are also snapshotted at the same two moments, so the inverse question ("I excluded this resource mid-run, is it still in maintenance?") has the same answer: yes, until the next trigger start.
