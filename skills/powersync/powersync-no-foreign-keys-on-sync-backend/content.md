# Why the PowerSync backend deliberately skips foreign keys

In a traditional relational schema, if `chatThreads.modeId` references `modes.id` and `modes` has a composite PK `(id, user_id)`, you would add a composite FK to keep the data clean. In a PowerSync-backed schema, Thunderbolt deliberately does not — `modeId` is just `text('mode_id')` with no `.references()` and no `foreignKey()`.

Four reasons:

1. **Sync server, not query engine.** Joins happen on the frontend SQLite. The backend exists to route writes into Postgres and stream diffs to other devices.
2. **E2E encryption.** Once rows contain ciphertext, the backend cannot meaningfully join or filter on them anyway.
3. **Write performance.** FK checks add a SELECT + lock on every INSERT/UPDATE. Sync traffic is constant.
4. **Partial-sync tolerance.** A new device may have the child row before the parent has arrived. Enforcing FKs would reject the write and force PowerSync into a retry loop.

## Hazards to watch

- You lose cascade-delete. Soft deletes (set `deletedAt`) sidestep this — if you must hard delete, mirror the cascade in the DAL.
- If non-sync query endpoints appear later, do not add FKs to the PowerSync tables. Put the queryable copy in a separate schema or materialized view.
- Don't add foreign-key indexes either. The backend gets exactly one index per table: `user_id`.

## Evidence

- `docs/composite-primary-keys-and-default-data.md:56-99`
