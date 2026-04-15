---
name: auto-lock-must-not-bump-lastEditedTime
category: pitfall
summary: |
  Background "auto-lock inactive page" jobs must not update lastEditedTime/modifiedAt on the
  page they lock — otherwise every page touched in one run ends up with the same timestamp and
  "recently edited" views become meaningless.
source:
  kind: project
  ref: lucida-snote
---

# Pitfall: auto-lock updating lastEditedTime makes pages collide on timestamp

## Fact
When a scheduled job locks N inactive pages in the same run, do **not** let the locking code path update the page's `lastEditedTime` / `modifiedAt`. If it does, all N pages record a near-identical timestamp, breaking "recently edited" sort order and any inactivity-based heuristics that depend on that column — including the auto-lock job itself on the next run.

## Why
This was discovered in a Notion-style collaborative doc app: the auto-lock service shared the generic "page updated" code path which always bumped `lastEditedTime`. The side effect was that locking a batch of inactive pages made them all look freshly edited, polluting user-facing sorts and preventing them from ever being eligible for auto-lock again without manual intervention.

## How to apply
- Automated state transitions (auto-lock, auto-archive, TTL sweeps) should write only the state columns they own (`locked`, `archived`, `inTrash`, etc.) — **not** user-facing modification timestamps.
- Give these jobs their own `MongoTemplate.updateMulti` / targeted `@Update` query rather than reusing the generic entity save path that triggers audit hooks.
- If you need an audit trail for the automated change, write to a dedicated "job history" collection keyed by the job name, not by piggy-backing on the entity's edit timestamp.
- When adding a new scheduled job that mutates user-visible entities, review whether it inherits any "touch-on-save" behavior (e.g. auditing, `@LastModifiedDate`, version bump) and suppress it explicitly.
