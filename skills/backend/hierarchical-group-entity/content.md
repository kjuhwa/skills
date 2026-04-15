# Hierarchical group entity on MongoDB

## Fields

- `parentId` — direct parent reference.
- `path` — slash-joined human-readable breadcrumb (`/root/ops/web`).
- `pathIds` — array of ancestor ids in order; enables subtree query via `pathIds: <ancestor>`.
- `level` — zero-based depth; enables depth queries and UI indent without re-walking.
- `order` — sibling ordering within a parent.
- `systemGroup` (optional) — protects root/default nodes from delete/move.

## Indexes

- `{parentId: 1, order: 1}` for child listing.
- `{pathIds: 1}` for subtree scans.
- `{name: 1, parentId: 1}` unique for sibling-name uniqueness (NOT global-name unique — see pitfall).

## Operations

1. **Create:** compute `path = parent.path + "/" + name`, `pathIds = parent.pathIds + [parent.id]`, `level = parent.level + 1`.
2. **Rename:** update self's `path`; recursively update every descendant's `path` (name segment substitution) — descendants' `pathIds`/`level` unchanged.
3. **Move:** validate target is not self or a descendant (cycle check via `pathIds.contains(self.id)`); recompute `path`, `pathIds`, `level` for self AND every descendant.
4. **Delete:** block if children exist; or cascade — decide per product. System-flagged nodes must reject delete/move.
5. **Reorder:** bulk update `order` within a parent in one transaction.

## Cycle detection

Before move, check `newParent.pathIds` does not contain `self.id` AND `newParent.id != self.id`. This is O(1) with pathIds.

## Counter / caveats

- Path string breaks if names can contain `/`; either forbid or escape.
- On very deep trees (>100) the recursive descendant update becomes a large bulk write — batch it.
- Name-uniqueness must be scoped to parent, not global; a global unique index on name is a common miss.
