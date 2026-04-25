---
name: union-merge-catalog-first-seen-wins
description: "When union-merging catalog JSON across N PR branches, use first-seen-wins per slug to preserve install metadata"
category: decision
tags:
  - merge-strategy
  - registry
  - catalog
  - install-metadata
  - first-seen-wins
version: 0.1.0-draft
---

# Decision: union-merge catalog JSON with first-seen-wins per slug

## Decision

When consolidating N branches that each add entries to a shared catalog JSON file (e.g. `registry.json`, `package.json`-like indexes), the union-merge MUST use **first-seen-wins** semantics — the value from the first source containing a given slug is kept; subsequent sources do not overwrite.

## Rationale

Catalog JSON entries typically carry **install metadata** that is authored once at first appearance:

```json
{
  "skills": {
    "<slug>": {
      "category": "...",
      "version": "...",
      "installed_at": "2026-04-16T00:40:04Z",   // <-- the FIRST install time
      "source_commit": "a974d4a...",            // <-- the commit that added it
      "pinned": false
    }
  }
}
```

If the slug already exists on `main`, that's the authoritative metadata. A re-publish PR may re-list the same slug with a NEW `installed_at` (today's date) and a new `source_commit` (today's branch). **Last-wins would silently rewrite history** — the install date no longer reflects when the entry actually first appeared in the corpus.

First-seen-wins preserves:
- `installed_at` as the original first-publish timestamp (audit trail)
- `source_commit` as the actual originating commit (provenance)
- `pinned` flag if previously set by an operator (intent)

## Implementation pattern

```python
merged = {"skills": {}, "knowledge": {}}

# Load main FIRST — it has authoritative entries
with open("registry.json", encoding="utf-8") as f:
    base = json.load(f)
merged["skills"].update(base.get("skills", {}))
merged["knowledge"].update(base.get("knowledge", {}))

# Then iterate branches, ADDING only what main doesn't have
for branch in branches:
    pr_reg = load_branch_registry(branch)
    for slug, meta in pr_reg.get("skills", {}).items():
        if slug not in merged["skills"]:        # FIRST-SEEN WINS
            merged["skills"][slug] = meta
    for slug, meta in pr_reg.get("knowledge", {}).items():
        if slug not in merged["knowledge"]:
            merged["knowledge"][slug] = meta
```

The `if slug not in merged` guard is the entire decision in one line.

## When the rule does NOT apply

- Catalog entries that are intended to **reflect the latest state** (e.g. `last_modified`, `current_version`) — those should be last-wins or recomputed from filesystem.
- Sparse-update flows where a branch genuinely UPDATES (not just RE-LISTS) an existing entry — case-by-case merge needed, not a blanket strategy.
- Catalogs without authoritative install metadata — last-wins is fine if entries carry no provenance.

## Concrete usage

This rule was applied during the recovery of 20 conflicting batch-publish PRs (#1087–#1106 → #1107). Result:

- Pre-existing 381 skills on main retained their April-16 install dates and original source commits.
- 533 newly-added skills inherited their respective batch's metadata.
- No history-rewriting on existing entries.

The alternative (last-wins) would have rewritten every existing skill's `installed_at` to the recovery date, losing months of audit trail.

## Related

- `knowledge/workflow/batch-pr-conflict-recovery` — the broader pattern this decision lives inside
- `skills/workflow/consolidate-batch-publish-pr-conflicts` — runnable procedure that applies this rule (Phase 2)
