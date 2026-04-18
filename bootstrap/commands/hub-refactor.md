---
description: Scan kjuhwa/skills.git for merge, split, and archive candidates and produce refactor drafts in one pass
argument-hint: [--scope=all|<category>] [--merge-threshold=<float>] [--split-min-lines=<n>] [--max-merges=<n>] [--max-splits=<n>] [--max-archives=<n>] [--dry-run] [--yes]
---

# /hub-refactor $ARGUMENTS

One-shot refactor pass over the remote skills repo. Identifies:

- **Merge candidates** — clusters of skills/knowledge with overlapping intent, similar tags, or near-duplicate content.
- **Split candidates** — entries that are too large or cover multiple distinct concerns.
- **Archive candidates** — low-value entries that should stop being offered to installers without deleting them from git history. Archived entries keep their files but gain an `archived: true` frontmatter flag; `/hub-install*` and `/hub-sync` must skip them.

For merge/split candidates, produces a draft in `.skills-draft/` / `.knowledge-draft/` by delegating to `/hub-merge` and `/hub-split`. For archive candidates, writes a single aggregate patch file `.skills-draft/_ARCHIVE_PATCHES.yaml` listing the frontmatter flips; `/hub-publish-all` reads it and flips the flags on the remote in one commit. Nothing on the remote is modified by this command — all output is drafts.

Use this periodically (monthly, or after a burst of `/hub-publish-skills` activity) to keep the remote registry coherent. For targeted single-operation refactors, use `/hub-merge` or `/hub-split` directly.

## Execution strategy (v2.6.1+)

Bulk scanning MUST be delegated to an `Explore` subagent. The main thread only synthesises drafts from the returned candidate list.

```
Agent(
  subagent_type="Explore",
  description="<short task name>",
  prompt="""
Scan ~/.claude/skills-hub/remote/skills/** and knowledge/** for two lists:
  merge_candidates: clusters of entries with high semantic overlap (title, description, tag overlap) suitable for consolidation
  split_candidates: entries >= 400 body lines with >= 2 distinct topical clusters (content, tags, or section headers)
For each: name, kind, category, reason, proposed action.

Return a ranked list (top N per `--max-*` flag or sensible default) with: name, kind (skill|knowledge), category, 1-line description, source path(s), confidence. Drop anything project-specific or non-generalizable.
""",
)
```

After the subagent returns, read **only** the few MDs needed to write final drafts. Do **not** iterate `Read` across dozens of files in the main thread — it burns tokens, fragments history, and produces no better result than delegation. (v2.6.1 added this rule after a `/hub-import` run did 73 tool calls to scan one repo.)


## Arguments

- `--scope=all|<category>` — restrict the scan. Default `all`.
- `--merge-threshold=<float>` — cosine-style similarity floor for merge candidates, on `[0.0, 1.0]`. Default `0.72`. Higher → fewer, tighter clusters.
- `--split-min-lines=<n>` — skill/knowledge must exceed this body line count before being considered for split. Default `400`.
- `--max-merges=<n>` — cap on merge proposals. Default `5`.
- `--max-splits=<n>` — cap on split proposals. Default `5`.
- `--max-archives=<n>` — cap on archive proposals. Default `5`.
- `--dry-run` — print the candidate report and stop without writing any drafts.
- `--yes` — auto-accept every candidate the scan surfaces (still shows the report). **Use with care** — for a healthy remote you usually want to review per-candidate.

## Steps

1. **Refresh remote cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`. Read-only.

2. **Inventory**
   - Walk `skills/<category>/<name>/SKILL.md` and `knowledge/<category>/<slug>.md` (filtered by `--scope`).
   - For each entry, record: kind, category, slug, body line count, frontmatter (`name`, `description`, `tags`, `triggers`, `summary`).

3. **Detect merge candidates**
   - Build per-entry feature vectors from: `name`, `description`, `tags`, `triggers`, top tokens from body. Cheap bag-of-tokens + IDF weighting is enough — this is heuristic, not ML.
   - Pairwise similarity within (kind, category) cohort. Cross-category pairs are considered only if tag overlap ≥ 3.
   - Cluster pairs above `--merge-threshold` using single-linkage; clusters of size ≥2 become merge candidates.
   - Drop any cluster where one member is already marked `superseded` in remote frontmatter.
   - Rank clusters by (max-pairwise-similarity × cluster-size); take top `--max-merges`.

4. **Detect split candidates**
   - For each entry with body lines ≥ `--split-min-lines`:
     - Run a lightweight version of `/hub-split`'s strategy detector (`auto` mode dry-run) to confirm at least 2 clean splits would emerge.
     - If yes, mark as split candidate. If detector says "no clean splits" — even though the entry is large — skip; oversize alone isn't a reason.
   - Rank by (body-lines × detected-cluster-count); take top `--max-splits`.

4.5. **Detect archive candidates**
   - Skip any entry whose frontmatter already has `archived: true` — already archived.
   - `body_lines` for skills is counted across BOTH `SKILL.md` body and `content.md` body (common pattern: SKILL.md is frontmatter-only, real body lives in `content.md`). For knowledge, it is just the single markdown file's body.
   - Flag an entry when ANY of these conditions holds. The condition that triggered the flag becomes the `archived_reason`:
     - **A. Perma-stub (skills only, non-imported)**: `kind == skill` AND `source_type != "external-git"` AND combined `body_lines < 15` AND `version` ends with `-draft` (or is missing). Knowledge entries are intentionally short and typically carry no version; externally-imported skills are short by design (single-prompt imports with `0.1.0-draft` is their expected shape). Neither gets flagged by A. Reason: `"perma-stub: <N> body lines, draft version never promoted"`.
     - **B. Metadata-empty (skills only, non-imported)**: `kind == skill` AND `source_type != "external-git"` AND `tags` is empty AND `triggers` is empty AND `len(description) < 60`. Knowledge uses a different frontmatter schema (`summary` / `source` / `confidence`) that omits `tags` and `triggers` by convention; externally-imported skills (gstack etc.) are packaged as-is and their metadata conventions are not ours to second-guess. Neither gets flagged by B. When parsing `description`, honor YAML block-scalar forms (`description: |` + indented lines). Reason: `"metadata-empty: no tags, no triggers, description < 60 chars"`.
     - **C. Superseded-by-stable (both kinds)**: some OTHER entry's frontmatter `supersedes` list contains this entry's selector, AND that successor's `version` is not a draft (does not end with `-draft`, is not empty). Reason: `"superseded by <successor-selector> @ <successor-version>"`.
   - Rank by: stub first (A), then superseded (C), then metadata-empty (B); within each bucket, by body_lines ascending (smallest stubs first). Take top `--max-archives`.

5. **Resolve overlap**
   - If an entry is both inside a merge cluster AND a split candidate, prefer **merge** (consolidating duplicates first leaves a cleaner target for any later split). Drop it from the split list and note this in the report.
   - If an entry is an archive candidate AND also inside a current-pass merge cluster: drop it from archive — the merge already marks it `supersedes`, and the next `/hub-refactor` pass will re-detect it under condition C after the merge publishes. Note this in the report.
   - If an entry is an archive candidate AND also a split candidate: drop the split — archiving a stub beats splitting it. Note this in the report.

6. **Candidate report** (always shown)
   - Three tables:
     ```
     === hub-refactor candidates (scope: all) ===

     MERGE candidates (3):
       M1  cluster-size=3  max-sim=0.81
           + skill:backend/retry-with-jitter-backoff
           + skill:backend/retry-on-5xx
           + skill:backend/exponential-backoff
           proposed slug:  backend/unified-retry-strategy

       M2  cluster-size=2  max-sim=0.74
           + knowledge:api/idempotency-key-per-tenant
           + knowledge:api/idempotency-key-conflict-resolution
           proposed slug:  api/idempotency-key-handling

       ...

     SPLIT candidates (2):
       S1  skill:backend/retry-strategy
           body: 612 lines, strategy: concern -> 3 splits
           proposed slugs: retry-strategy-read-path, retry-strategy-write-path, retry-strategy-observability

       S2  knowledge:arch/event-sourcing-everything
           body: 540 lines, strategy: section -> 4 splits
           ...

     ARCHIVE candidates (3):
       A1  skill:misc/abandoned-stub
           reason: perma-stub: 8 body lines, draft version never promoted

       A2  skill:arch/module-federation-expose-wrapper
           reason: superseded by skill:frontend/module-federation-expose-react-component @ v1.0.0

       A3  knowledge:domain/empty-placeholder
           reason: metadata-empty: no tags, no triggers, description < 60 chars

     Skipped (overlap): skill:backend/retry-strategy was also a split candidate but is now part of merge cluster M1's outcome; revisit on the next pass.
     ```
   - If `--dry-run` → stop here.
   - Else prompt per candidate: `accept / skip / edit-args / cancel-all`. `--yes` accepts everything.
     - `edit-args` lets the user override `--name`, `--category`, `--by`, `--max` for merge/split. For archive, `edit-args` lets the user override `archived_reason` text.

7. **Apply accepted candidates**
   - For each accepted **merge** candidate: invoke `/hub-merge <selectors...> --as=<auto-or-user-override> --name=<proposed-or-user> --category=<resolved> --yes` (the inner `--yes` is safe here because the outer prompt already constituted the per-candidate review).
   - For each accepted **split** candidate: invoke `/hub-split <selector> --by=<auto-or-user> --max=<auto-or-user> --yes`.
   - For each accepted **archive** candidate: append an entry to `.skills-draft/_ARCHIVE_PATCHES.yaml`. Do not delegate to a separate command — archive is a small frontmatter flip and is handled inline. Schema:
     ```yaml
     # .skills-draft/_ARCHIVE_PATCHES.yaml
     # Produced by /hub-refactor. Consumed by /hub-publish-all, which flips the
     # frontmatter flag on each listed entry in the remote repo. Entries in this
     # file do NOT create new drafts — they modify existing entries in place.
     patches:
       - path: skills/arch/module-federation-expose-wrapper/SKILL.md
         kind: skill
         selector: "skill:arch/module-federation-expose-wrapper"
         archived: true
         archived_reason: "superseded by skill:frontend/module-federation-expose-react-component @ v1.0.0"
         archived_at: 2026-04-17
         detected_by: "/hub-refactor"
       - path: knowledge/domain/empty-placeholder.md
         kind: knowledge
         selector: "knowledge:domain/empty-placeholder"
         archived: true
         archived_reason: "metadata-empty: no tags, no triggers, description < 60 chars"
         archived_at: 2026-04-17
         detected_by: "/hub-refactor"
     ```
     Never rewrite an existing patches list — append only, deduped by `path`. If a `path` already exists in the file, update its reason and timestamp but do not duplicate the row.
   - Aggregate the resulting draft paths (merge/split) AND the archive patch file path.

8. **Persist a refactor manifest**
   - Write `.skills-draft/_REFACTOR_MANIFEST.md` with:
     - Date, scope, thresholds used.
     - Per-candidate outcome: merge → resulting draft slug + sources; split → resulting draft slugs + source; archive → path + reason.
     - "Pending" entries that the user skipped (so the next refactor pass starts with that context).
   - Publish commands ignore files starting with `_` during the normal draft walk. The manifest is for human review; the archive patches file is special-cased by `/hub-publish-all`.

9. **Report**
   - Print summary: `M merge drafts written, S × splits-per-source split drafts written, A archive patches appended, K skipped`.
   - Recommend next step: `/hub-publish-all --pr` so all refactor drafts ship as one branch + one PR with cross-links intact. `/hub-publish-all` applies archive patches as frontmatter edits in the same PR.

## Rules

- **Read-only on the remote cache.** All output is drafts.
- **Never auto-publish.** Refactor proposals always go through `/hub-publish-all` (or `/hub-publish-skills` + `/hub-publish-knowledge`) under user control.
- **Heuristic only.** Similarity scoring is bag-of-tokens; it surfaces *candidates*, not decisions. The user is the arbiter — never proceed past the candidate prompt without explicit acceptance unless `--yes` was passed.
- **Bias toward merge over split** when an entry qualifies for both (Step 5). Splitting a duplicate produces more duplicates.
- **Archive is a soft-delete, never a hard delete.** Never remove files from the remote repo. Archive only flips `archived: true` in frontmatter; git history stays intact. Users who want to resurrect an archived entry can manually flip the flag back.
- **Never archive an entry in a current-pass merge cluster.** Let the merge run first; the next `/hub-refactor` pass will pick up the leftover stubs under archive condition C.
- **No cascading refactors in one run.** A skill produced by Step 7's merge isn't fed back into Step 4's split detector — that would oscillate. Run `/hub-refactor` again after publishing if needed.
- **Honor caps strictly.** `--max-merges`, `--max-splits`, and `--max-archives` are hard caps. The rankers discard low-rank candidates rather than expanding the queue.
- **Inherits sanitization, provenance, and "do not modify source" rules** from `/hub-merge` and `/hub-split`.
- **Refuse empty scope.** If the inventory under `--scope` has fewer than 5 entries, refuse with a clear message — the heuristic isn't useful at small N.

## Examples

```
# Periodic full-repo refactor pass (interactive review)
/hub-refactor

# Just look — no drafts written
/hub-refactor --dry-run

# Tighter merge threshold, only the backend category
/hub-refactor --scope=backend --merge-threshold=0.80

# Split-heavy pass: only consider entries above 600 lines
/hub-refactor --split-min-lines=600 --max-merges=0

# Archive-only sweep — skip merge and split, hunt for stubs and empty entries
/hub-refactor --max-merges=0 --max-splits=0 --max-archives=20

# Trust the heuristic for everything (still preview, then auto-write)
/hub-refactor --yes
```

## When NOT to use

- You already know exactly which entries to merge or split → use `/hub-merge` or `/hub-split` directly. They're cheaper and don't waste a heuristic pass.
- You haven't published anything in a while → there's nothing new to refactor.
- The remote has fewer than ~10 entries in the chosen scope — heuristics need volume to be useful.
