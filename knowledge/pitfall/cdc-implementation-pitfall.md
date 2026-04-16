---
name: cdc-implementation-pitfall
description: Common CDC visualization and simulation bugs around snapshot consistency, operation weighting, and stateful replay ordering.
category: pitfall
tags:
  - cdc
  - auto-loop
---

# cdc-implementation-pitfall

The most dangerous CDC pitfall is **missing the before-snapshot on mutations**. In cdc-table-diff, every UPDATE and DELETE must clone the current table state *before* applying the change, then render the clone as the "before" panel. If you apply the mutation first and try to reconstruct the prior state, you've lost it — particularly for DELETE where the row no longer exists. The app handles this with `before = rows.map(r => ({...r}))`, but shallow cloning only works for flat rows. Nested objects (JSONB columns, embedded documents) require deep cloning or the "before" panel will show the mutated values due to shared references. Any CDC diff viewer that skips this clone step will show identical before/after panels, making the tool useless.

**Operation distribution skew** silently ruins realism. The stream-monitor uses `Math.random() < 0.5 ? INSERT : (Math.random() < 0.7 ? UPDATE : DELETE)`, which produces roughly 50/15/35 INSERT/UPDATE/DELETE — not the labeled 50/35/15. The nested conditional inverts UPDATE and DELETE probabilities because the second random call operates on the remaining 50%, not the full distribution. Real CDC streams from OLTP databases typically show 10–20% INSERT, 60–70% UPDATE, 10–20% DELETE in steady state, with INSERT-heavy bursts during batch loads. Using a flat `Math.random()` without a proper weighted-selection function will always produce unrealistic ratios that mislead capacity planning.

**Stateful replay ordering** is the third trap. The table-diff applies changes sequentially via an index counter (`ci`), but the UI allows switching between tables freely via the dropdown. If a user switches tables mid-replay, they see current state of that table (which may have already been mutated by earlier changes) without context of *which* changes were applied. There's no per-table undo stack or event log filter. In production CDC tools, this manifests as "phantom diffs" — a user looks at a table, sees unexpected state, but can't trace which event caused it because the log shows all tables interleaved. The fix is per-table change indexing and the ability to filter the changelog by table, but none of the three apps implement this, which means replay-based debugging breaks down once you exceed ~10 interleaved changes across multiple tables.
