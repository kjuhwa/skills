---
description: Scan kjuhwa/skills-hub for duplicated content chunks across entries and for single-entry compression opportunities, producing tightening drafts in one pass
argument-hint: [--mode=dedup|compress|auto] [--scope=all|<category>] [--dedup-min-lines=<n>] [--dedup-min-occurrences=<n>] [--compress-min-lines=<n>] [--compress-min-savings=<pct>] [--max-dedups=<n>] [--max-compressions=<n>] [--dry-run] [--yes]
---

# /hub-condense $ARGUMENTS

Corpus-level content tightening pass. Finds:

- **Dedup candidates** — identical text chunks (paragraphs, code fences) appearing in ≥2 entries. Proposes keeping one canonical copy and replacing the rest with short references, so the same snippet lives in one place.
- **Compression candidates** — single entries that look verbose (high body size, low information density). Proposes an LLM-rewritten tightened version that preserves facts, examples, and code but removes filler and redundant restatements.

Produces drafts under `.skills-draft/` (and a `_CONDENSE_PATCHES.yaml` aggregate patch file for the dedup reference-replacements). Never modifies the remote. Output is reviewed and shipped via `/hub-publish-all`.

Different axis from `/hub-cleanup` (which handles metadata hygiene: malformed frontmatter, orphan files, name collisions, index drift) and from `/hub-refactor` (which consolidates whole entries via merge / splits oversized entries / archives low-value ones). `/hub-condense` operates on the **text inside** entries.

## Arguments

- `--mode=dedup|compress|auto` — which pass(es) to run. Default `auto` (both).
- `--scope=all|<category>` — restrict the scan. Default `all`.
- `--dedup-min-lines=<n>` — minimum block size to consider for dedup, measured in lines. Default `3`. Separately tracks code fences and prose blocks.
- `--dedup-min-occurrences=<n>` — a block must appear in at least this many entries to be flagged. Default `2`.
- `--compress-min-lines=<n>` — skill combined body (SKILL.md + content.md) or knowledge body must exceed this before compression is attempted. Default `150`.
- `--compress-min-savings=<pct>` — reject an LLM rewrite whose line-count reduction is below this. Default `15`. Prevents cosmetic rewrites that add review burden without meaningful tightening.
- `--max-dedups=<n>` — cap on dedup proposals. Default `5`.
- `--max-compressions=<n>` — cap on compression proposals. Default `5`.
- `--dry-run` — print the candidate report and stop without writing any drafts or calling the LLM.
- `--yes` — auto-accept every candidate the scan surfaces (still shows the report). **Use with care.** For compression in particular, per-candidate review of the diff is strongly recommended.

## Steps

1. **Refresh remote cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`. Read-only.

2. **Inventory**
   - Walk `skills/<category>/<name>/SKILL.md` + `content.md` and `knowledge/<category>/<slug>.md` (filtered by `--scope`).
   - Record per-entry: kind, category, slug, combined body text, body line count, frontmatter (including `archived` — skip archived entries).

3. **Detect dedup candidates** (mode=dedup|auto)
   - For each entry, extract candidate blocks:
     - **Code fences**: every ` ``` ` block, stripped of surrounding markdown but keeping the language tag so `js` and `ts` blocks of similar text stay separate.
     - **Prose paragraphs**: contiguous non-blank lines separated by a blank line, excluding H1–H3 heading lines.
   - Filter: blocks where `line_count >= --dedup-min-lines`.
   - Normalize: strip trailing whitespace, collapse internal runs of spaces, trim empty leading/trailing lines. Do NOT lowercase (case-changes often carry meaning — e.g. SQL keywords, identifiers).
   - Hash each normalized block (SHA-256 truncated to 16 hex chars).
   - Group by hash. Keep groups where distinct-entry count ≥ `--dedup-min-occurrences`.
   - Drop groups whose canonical block is already a reference (line matches `^>\s*See\s+(skill|knowledge):` or starts with `See \`content.md\``).
   - Pick canonical home for each group by this priority (first match wins):
     - member with `version` not ending in `-draft` and highest semver
     - member whose kind is `knowledge` (knowledge is the natural home for shared reference material)
     - member whose `body_lines` is largest (most context around the block)
     - alphabetically-first `category/slug` (deterministic tie-break)
   - Rank groups by `(occurrence_count × block_line_count)`; take top `--max-dedups`.

4. **Detect compression candidates** (mode=compress|auto)
   - For each entry with combined `body_lines >= --compress-min-lines`:
     - Compute a cheap "verbosity score" before invoking the LLM: `1.0 - unique_token_ratio`, plus +0.1 per detected filler marker (`"in order to"`, `"it should be noted"`, `"as mentioned"`, `"basically"`, `"simply"`, `"just"` as sentence opener). Higher score = more compressible.
     - Skip entries with score < 0.25 (already dense).
   - For remaining entries, ask the LLM (Claude Sonnet / Opus — operator-side choice) to produce a tightened version under these constraints:
     - Preserve ALL code fences verbatim (language tags, indentation, content).
     - Preserve ALL top-level sections (`##` headings) and their order.
     - Preserve frontmatter exactly, except bump `version` to `<current>-draft` if not already draft. Do NOT add or remove frontmatter fields.
     - Never drop facts, examples, pitfalls, or "Why" rationale. Tighten the prose around them.
     - Never introduce new claims or examples the original did not contain.
   - Compute `savings_pct = 1 - (rewritten_body_lines / original_body_lines)`. Reject if below `--compress-min-savings`. Do NOT silently accept a low-savings rewrite — reject and move on.
   - Rank surviving candidates by `(savings_pct × original_body_lines)`; take top `--max-compressions`.

5. **Resolve overlap**
   - If a compression candidate's rewritten body would remove a block that is part of a dedup group, prefer **dedup**. Drop the compression candidate from this pass; the next `/hub-condense` run will re-consider it after dedup references land.
   - A block may appear in multiple dedup groups only if the groups have different canonical homes (shouldn't happen if normalization is consistent — if it does, flag it as a bug and skip the group).

6. **Candidate report** (always shown)
   - Two tables:
     ```
     === hub-condense candidates (scope: all) ===

     DEDUP candidates (2):
       D1  occurrences=3  block-size=12 lines (code fence, lang=java)
           canonical: skill:backend/retry-with-jitter-backoff
           duplicated in:
             - skill:backend/retry-on-5xx         (lines 42-53)
             - skill:backend/exponential-backoff  (lines 18-29)

       D2  occurrences=2  block-size=6 lines (prose paragraph)
           canonical: knowledge:pitfall/retry-storms-without-jitter
           duplicated in:
             - skill:backend/retry-with-jitter-backoff (lines 88-93)
             - skill:backend/retry-on-5xx              (lines 71-76)

     COMPRESSION candidates (1):
       C1  skill:workflow/long-ship-walkthrough
           body: 612 lines -> 478 lines  (savings: 22%)
           verbosity-score: 0.41
           LLM: claude-sonnet-4-6
     ```
   - If `--dry-run` → stop here. (For compression, this means "do not invoke the LLM at all" — skip the rewrite step entirely.)
   - Else prompt per candidate:
     - Dedup: `accept / pick-other-canonical / skip / cancel-all`
     - Compression: `accept / view-diff / skip / cancel-all`
   - `--yes` accepts everything. For compression under `--yes`, the LLM is still invoked; `--dry-run` is the only way to avoid LLM calls.

7. **Apply accepted candidates**
   - For each accepted **dedup** candidate: append an entry to `.skills-draft/_CONDENSE_PATCHES.yaml` describing the reference-replacement. Do not emit a full draft per affected entry — the reference swap is a small in-place edit and is handled inline by `/hub-publish-all`. Schema:
     ```yaml
     # .skills-draft/_CONDENSE_PATCHES.yaml
     dedup:
       - group_id: D1
         canonical:
           kind: skill
           path: skills/backend/retry-with-jitter-backoff/content.md
           block_hash: "a3f2c1b4..."
         replacements:
           - path: skills/backend/retry-on-5xx/content.md
             line_range: [42, 53]
             replace_with: |
               > Canonical example: [skill:backend/retry-with-jitter-backoff](../retry-with-jitter-backoff/content.md)
           - path: skills/backend/exponential-backoff/content.md
             line_range: [18, 29]
             replace_with: |
               > Canonical example: [skill:backend/retry-with-jitter-backoff](../retry-with-jitter-backoff/content.md)
         detected_by: "/hub-condense"
         approved_at: 2026-04-17
     ```
   - For each accepted **compression** candidate: write the rewritten content under `.skills-draft/<kind>/<category>/<slug>/` (skills → directory with rewritten SKILL.md + content.md; knowledge → single rewritten .md). Include a sibling `_COMPRESSION_ORIGINAL.md` capturing the pre-rewrite body for publish-time review.
   - Aggregate the resulting draft paths (compression) AND the patches file path (dedup).

8. **Persist a condense manifest**
   - Write `.skills-draft/_CONDENSE_MANIFEST.md` with:
     - Date, scope, thresholds used.
     - Per-candidate outcome: dedup → canonical + replacements; compression → draft path + savings_pct.
     - "Pending" entries the user skipped.

9. **Report**
   - Print summary: `D dedup groups written, C compression drafts written, K skipped`.
   - Recommend next step: `/hub-publish-all --pr`. Archive and dedup patch files are both special-cased by `/hub-publish-all`; compression drafts follow the normal draft-update flow.

## Rules

- **Read-only on the remote cache.** All output is drafts or aggregate patch files.
- **Never auto-publish.** Condense proposals always go through `/hub-publish-all` under user control.
- **Never compress without LLM approval visible.** A compression rewrite always requires either interactive `view-diff → accept`, or `--yes` which still produces a diff-reviewable draft the user must publish explicitly.
- **Preserve code fences exactly** during compression. The LLM is allowed to reorder prose and tighten language; it is not allowed to edit code. If a rewrite modifies a code block, reject it.
- **Preserve headings and frontmatter.** The rewrite is a prose tightening, not a restructure. Structural changes should go through `/hub-refactor` (merge / split).
- **Dedup priority is canonical-home-first.** When three entries share a block, pick one home, replace the other two. Do NOT replace all three with cross-references — that breaks the link chain.
- **Skip archived entries.** `archived: true` entries are not considered for either dedup or compression (they are not surfaced to installers anyway).
- **Honor caps strictly.** `--max-dedups` and `--max-compressions` are hard caps. Rankers discard low-rank candidates rather than growing the queue.
- **No cascading condense in one run.** A compressed entry's rewritten body isn't fed back into Step 3's dedup detector — that would oscillate. Run `/hub-condense` again after publishing if needed.
- **Refuse empty scope.** If the inventory under `--scope` has fewer than 5 entries, refuse — the heuristic isn't useful at small N.

## Examples

```
# Periodic content-tightening pass (interactive review)
/hub-condense

# Just look — no LLM calls, no drafts written
/hub-condense --dry-run

# Dedup only (no compression pass, no LLM calls)
/hub-condense --mode=dedup

# Compression only, stricter savings threshold
/hub-condense --mode=compress --compress-min-savings=25

# Only consider entries above 300 lines for compression, backend scope
/hub-condense --scope=backend --compress-min-lines=300

# Trust the heuristic for everything (still previews, then auto-writes)
/hub-condense --yes
```

## When NOT to use

- You already know exactly which block is duplicated → just edit by hand. `/hub-condense` is for discovery across the whole corpus.
- The entry is short (< 150 lines body) → compression adds review burden with minimal payoff.
- You want to restructure an entry (split into multiple, merge into another) → that is `/hub-refactor`.
- You want metadata / hygiene fixes (malformed frontmatter, stale entries, orphan files) → that is `/hub-cleanup`.
