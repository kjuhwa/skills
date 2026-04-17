---
name: hub-soft-delete-via-frontmatter-flag
type: knowledge
category: decision
tags: [skills-hub, archive, soft-delete, frontmatter, decision]
summary: "Skills-hub retires low-value entries via an `archived: true` frontmatter flag — never via file deletion. Installers and sync commands skip archived entries; git history remains intact for auditability and un-archive."
source:
  kind: session
  ref: hub-refactor archive feature 2026-04-17 (bootstrap/v2.3.0)
confidence: high
linked_skills: []
---

# Decision: soft-delete retired hub entries via frontmatter, not file removal

## Decision

When `/hub-refactor` (and future similar commands) retire a skill or knowledge entry, the retirement is a **frontmatter flip**, not a file deletion:

```yaml
archived: true
archived_reason: "perma-stub: 8 body lines, draft version never promoted"
archived_at: 2026-04-17
```

The file stays in git. All install/list/search commands skip it.

## Why

1. **Reversibility is cheap** — archiving a working entry wrongly is a 1-line frontmatter edit to undo. Recovering a deleted file is a 3-step git operation under time pressure (find the last commit, revert, re-push).
2. **Audit trail matters** — teams need to see "who archived this and why" without spelunking `git log`. The `archived_reason` + `archived_at` fields are self-documenting.
3. **Downstream cache invalidation is simpler** — already-installed copies that become archived upstream stay functional until the user runs `/hub-sync`; sync then warns or removes them based on user preference. A hard delete breaks any user who sync'd before the delete was PR'd.
4. **Encourages aggressive archive** — because the cost of a mistake is low, the team is more willing to archive marginal entries, which keeps the install surface clean.

## How to apply

- `/hub-refactor`'s archive pass writes proposed flips to `.skills-draft/_ARCHIVE_PATCHES.yaml`. `/hub-publish-all` reads that file and applies the frontmatter edit in one commit alongside merge/split drafts.
- `/hub-install` and `/hub-install-all` filter `archived: true` from search results and bulk installs. `/hub-install <name> --include-archived` is the escape hatch for installing a specific archived entry on purpose.
- `/hub-sync` should apply the same filter (not yet implemented as of bootstrap/v2.4.1 — follow-up).
- New commands that enumerate the corpus (dedup, compress, etc.) must also skip archived entries. This mirrors the "skip archived entries" rule in both `/hub-refactor` and `/hub-condense` specs.

## Trade-offs

| Consideration | Soft delete (chosen) | Hard delete |
|---|---|---|
| Reversibility | 1-line edit | 3-step git op |
| Install surface | Filtered | Absent |
| Corpus size | Grows monotonically | Can shrink |
| Audit | Frontmatter + git | git only |
| Sync edge case | Installers skip | Installers break until sync |

The only real cost of soft-delete is the corpus growing monotonically. That's acceptable until it isn't — at which point a dedicated `/hub-cleanup --purge-archived-since=<date>` command can hard-delete entries that have been archived for >N months. Do not bake hard deletes into the archive path itself.

## Counter / Caveats

- If an entry contains sensitive content (leaked secret, accidental PII), this policy does NOT apply — those need a true removal via `git filter-repo` + force-push + history rewrite, separate from the archive flow. Archive is for "low value", not "dangerous to leave around".
- `archived: true` entries still consume index.json space and clone bandwidth. For very large corpora, a compaction pass might matter; not a concern at current scale (~700 entries).
- The flip is a write to the entry's own file — commands that scan must re-read frontmatter after accepting an archive candidate, not trust their in-memory snapshot from before the flip.
