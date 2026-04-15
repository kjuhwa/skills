---
name: push-local-removed-use-doc-update
description: pushLocalChangesIntoRemote and its action-mapping helpers were removed; mutate Yorkie via doc.update directly
type: decision
category: decision
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
The `pushLocalChangesIntoRemote()` indirection layer (and its siblings `actionTypeConfig.ts`, `actionMappingConfig.ts`) was removed in issue **#41** (2025-07-07). All local→remote Yorkie mutations now go through `doc.update(root => { ... })` directly, and handlers are called directly instead of dispatched through the mapping table.

**Why:** The mapping layer duplicated logic already expressible via `doc.update`, split the update path across two abstractions, and obscured which handler actually ran. Deleting it made ownership of each mutation explicit.

**How to apply:**
- Do not reintroduce a generic push/dispatch wrapper for Yorkie mutations.
- When porting older code that still references `pushLocalChangesIntoRemote`, replace the call site with a direct `doc.update` block and a direct handler call — that was the exact pattern used in the #41 cleanup.
- If you feel tempted to build an action-type registry, ask whether it is solving a problem the CRDT doc isn't already solving.

## Evidence
- Commits `b5322481`, `91a7d76c` (refactor: #41).
- `builder-ui/.claude/architecture.md` §4 change log "2025-07-07: pushLocalChangesIntoRemote() 제거 (#41)".
