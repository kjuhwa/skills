---
description: Scan kjuhwa/skills.git for merge and split candidates and produce both kinds of refactor drafts in one pass
argument-hint: [--scope=all|<category>] [--merge-threshold=<float>] [--split-min-lines=<n>] [--max-merges=<n>] [--max-splits=<n>] [--dry-run] [--yes]
---

# /skills_refactor $ARGUMENTS

One-shot refactor pass over the remote skills repo. Identifies:

- **Merge candidates** — clusters of skills/knowledge with overlapping intent, similar tags, or near-duplicate content.
- **Split candidates** — entries that are too large or cover multiple distinct concerns.

For each candidate, produces a draft (or set of drafts) in `.skills-draft/` / `.knowledge-draft/` by delegating to `/skills_merge` and `/skills_split` respectively. Nothing on the remote is modified. Output is reviewed and shipped via `/publish_all`.

Use this periodically (monthly, or after a burst of `/skills_publish` activity) to keep the remote registry coherent. For targeted single-operation refactors, use `/skills_merge` or `/skills_split` directly.

## Arguments

- `--scope=all|<category>` — restrict the scan. Default `all`.
- `--merge-threshold=<float>` — cosine-style similarity floor for merge candidates, on `[0.0, 1.0]`. Default `0.72`. Higher → fewer, tighter clusters.
- `--split-min-lines=<n>` — skill/knowledge must exceed this body line count before being considered for split. Default `400`.
- `--max-merges=<n>` — cap on merge proposals. Default `5`.
- `--max-splits=<n>` — cap on split proposals. Default `5`.
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
     - Run a lightweight version of `/skills_split`'s strategy detector (`auto` mode dry-run) to confirm at least 2 clean splits would emerge.
     - If yes, mark as split candidate. If detector says "no clean splits" — even though the entry is large — skip; oversize alone isn't a reason.
   - Rank by (body-lines × detected-cluster-count); take top `--max-splits`.

5. **Resolve overlap**
   - If an entry is both inside a merge cluster AND a split candidate, prefer **merge** (consolidating duplicates first leaves a cleaner target for any later split). Drop it from the split list and note this in the report.

6. **Candidate report** (always shown)
   - Two tables:
     ```
     === skills_refactor candidates (scope: all) ===

     MERGE candidates (3):
       M1  cluster-size=3  max-sim=0.81
           ⊕ skill:backend/retry-with-jitter-backoff
           ⊕ skill:backend/retry-on-5xx
           ⊕ skill:backend/exponential-backoff
           proposed slug:  backend/unified-retry-strategy

       M2  cluster-size=2  max-sim=0.74
           ⊕ knowledge:api/idempotency-key-per-tenant
           ⊕ knowledge:api/idempotency-key-conflict-resolution
           proposed slug:  api/idempotency-key-handling

       ...

     SPLIT candidates (2):
       S1  skill:backend/retry-strategy
           body: 612 lines, strategy: concern → 3 splits
           proposed slugs: retry-strategy-read-path, retry-strategy-write-path, retry-strategy-observability

       S2  knowledge:arch/event-sourcing-everything
           body: 540 lines, strategy: section → 4 splits
           ...

     Skipped (overlap): skill:backend/retry-strategy was also a split candidate but is now part of merge cluster M1's outcome; revisit on the next pass.
     ```
   - If `--dry-run` → stop here.
   - Else prompt per candidate: `accept / skip / edit-args / cancel-all`. `--yes` accepts everything.
     - `edit-args` lets the user override `--name`, `--category`, `--by`, `--max` for that candidate before delegation.

7. **Delegate to /skills_merge and /skills_split**
   - For each accepted **merge** candidate: invoke `/skills_merge <selectors...> --as=<auto-or-user-override> --name=<proposed-or-user> --category=<resolved> --yes` (the inner `--yes` is safe here because the outer prompt already constituted the per-candidate review).
   - For each accepted **split** candidate: invoke `/skills_split <selector> --by=<auto-or-user> --max=<auto-or-user> --yes`.
   - Aggregate the resulting draft paths.

8. **Persist a refactor manifest**
   - Write `.skills-draft/_REFACTOR_MANIFEST.md` with:
     - Date, scope, thresholds used.
     - Per-candidate outcome: merge → resulting draft slug + sources; split → resulting draft slugs + source.
     - "Pending" entries that the user skipped (so the next refactor pass starts with that context).
   - Publish commands ignore files starting with `_`.

9. **Report**
   - Print summary: `M merge drafts written, S × splits-per-source split drafts written, K skipped`.
   - Recommend next step: `/publish_all --pr` so all refactor drafts ship as one branch + one PR with cross-links intact.

## Rules

- **Read-only on the remote cache.** All output is drafts.
- **Never auto-publish.** Refactor proposals always go through `/publish_all` (or `/skills_publish` + `/knowledge_publish`) under user control.
- **Heuristic only.** Similarity scoring is bag-of-tokens; it surfaces *candidates*, not decisions. The user is the arbiter — never proceed past the candidate prompt without explicit acceptance unless `--yes` was passed.
- **Bias toward merge over split** when an entry qualifies for both (Step 5). Splitting a duplicate produces more duplicates.
- **No cascading refactors in one run.** A skill produced by Step 7's merge isn't fed back into Step 4's split detector — that would oscillate. Run `/skills_refactor` again after publishing if needed.
- **Honor caps strictly.** `--max-merges` and `--max-splits` are hard caps. The cluster ranker discards low-rank candidates rather than expanding the queue.
- **Inherits sanitization, provenance, and "do not modify source" rules** from `/skills_merge` and `/skills_split`.
- **Refuse empty scope.** If the inventory under `--scope` has fewer than 5 entries, refuse with a clear message — the heuristic isn't useful at small N.

## Examples

```
# Periodic full-repo refactor pass (interactive review)
/skills_refactor

# Just look — no drafts written
/skills_refactor --dry-run

# Tighter merge threshold, only the backend category
/skills_refactor --scope=backend --merge-threshold=0.80

# Split-heavy pass: only consider entries above 600 lines
/skills_refactor --split-min-lines=600 --max-merges=0

# Trust the heuristic for everything (still preview, then auto-write)
/skills_refactor --yes
```

## When NOT to use

- You already know exactly which entries to merge or split → use `/skills_merge` or `/skills_split` directly. They're cheaper and don't waste a heuristic pass.
- You haven't published anything in a while → there's nothing new to refactor.
- The remote has fewer than ~10 entries in the chosen scope — heuristics need volume to be useful.
