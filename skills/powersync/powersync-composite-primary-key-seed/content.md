# Composite PK seeding for default-data tables in PowerSync

PowerSync's backend holds data from every user in the same Postgres schema. When you seed default rows (e.g. a built-in model with id `openai-gpt-4o`) for each user, two users legitimately have rows with the same business id. A single-column primary key collides. Solution: composite PK that includes `user_id`.

## Backend shape

```ts
export const modelsTable = pgTable('models', {
  id: text('id').notNull(),
  userId: text('user_id').notNull(),
  // ...other columns
}, (t) => ({
  pk: primaryKey({ columns: [t.id, t.userId] }),
  idxUser: index('idx_models_user_id').on(t.userId),
}))

// Registered in the conflict target map
export const powersyncConflictTarget = {
  models: ['id', 'user_id'],
  settings: ['key', 'user_id'],
  // ...
}

// Tells the upload handler which column to use in the WHERE clause for PATCH/DELETE
export const powersyncPkColumn = {
  models: 'id',
  settings: 'key',
}
```

## Frontend shape

Single-column PK is fine — the local DB is per-user:

```ts
export const modelsTable = sqliteTable('models', {
  id: text('id').primaryKey(),
  // ...
})
```

## Reconcile defaults

`reconcileDefaultsForTable()` is the safety net that keeps defaults up-to-date without clobbering user edits:

```ts
const currentHash = hashFn(existing)
const defaultHashValue = hashFn(defaultItem)

if (!existing.defaultHash) {
  // Backfill: first time we see the row, record what shape it had.
  await update().set({ defaultHash: defaultHashValue })
} else if (currentHash === existing.defaultHash) {
  // User hasn't modified it since we last looked.
  if (existing.defaultHash === defaultHashValue) continue // no-op
  const wouldOverwriteUserValue =
    existing.value !== null && defaultItem.value === null
  if (wouldOverwriteUserValue) continue
  // Safe to update to new default.
  await update().set({ ...defaultItem, defaultHash: defaultHashValue })
}
// If hashes diverge, the user edited; leave their row alone.
```

The null-guard is specifically for localization settings (distance_unit, etc.) where the user sets a value through other code paths and the code default is `null`. Without the guard, rolling out a new default revision would silently wipe their choice.

## Evidence

- `docs/composite-primary-keys-and-default-data.md:7-53`
- `src/lib/reconcile-defaults.ts:22-101`
