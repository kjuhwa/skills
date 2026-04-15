---
description: Merge two or more skills and/or knowledge entries from kjuhwa/skills.git into a single new skill or knowledge draft
argument-hint: <selector1> <selector2> [<selectorN>...] [--as=skill|knowledge|auto] [--name=<slug>] [--category=<cat>] [--keep-sources] [--dry-run] [--yes]
---

# /skills_merge $ARGUMENTS

Combine 2+ existing entries from the remote skills repo (`kjuhwa/skills.git`) into one new draft. The new draft is **not** published automatically — it lands in `.skills-draft/` or `.knowledge-draft/` so you can review, edit, then ship via `/skills_publish` / `/knowledge_publish` / `/publish_all`.

Use when you discover overlapping skills/knowledge that should be a single, more coherent unit (e.g. three near-duplicate retry-pattern skills, or a skill plus three knowledge notes that always travel together).

## Selectors

A selector identifies one source entry in the remote. Accepted forms:

- `skill:<category>/<name>` — explicit skill, e.g. `skill:backend/retry-with-jitter-backoff`
- `skill:<name>` — shorthand if the skill name is unique across categories
- `knowledge:<category>/<slug>` — explicit knowledge entry, e.g. `knowledge:api/idempotency-key-per-tenant`
- `knowledge:<slug>` — shorthand if the slug is unique
- `<category>/<name>` — kind auto-detected by which tree contains it; ambiguous → error, require prefix
- `@<version>` suffix on any of the above pins to a tag (skills only): `skill:backend/retry-with-jitter-backoff@v1.2.0`

You must provide **at least 2** selectors. Mixing kinds (skill + knowledge) is allowed; see `--as` for output type rules.

## Arguments

- `<selector1> ... <selectorN>` (required, ≥2) — entries to merge.
- `--as=skill|knowledge|auto` — output kind. Default `auto`:
  - All sources are skills → output is **skill**.
  - All sources are knowledge → output is **knowledge**.
  - Mixed → output is **skill**, and every knowledge source is recorded under `linked_knowledge` in the new SKILL.md frontmatter (their bodies are summarized into the skill's `content.md` "Background" section, not duplicated as files).
- `--name=<slug>` — slug for the merged entry. Default: derived from the dominant theme of the sources, sanitized to `[a-z0-9-]+`. If you don't pass this, the dry-run will show the proposed slug and you can override before persist.
- `--category=<cat>` — category for the merged entry. Default: the most-common category among the sources; if all sources are in different categories, you **must** pass `--category` explicitly.
- `--keep-sources` — record-only flag for the draft frontmatter; does NOT delete or deprecate the source entries on the remote. Default behavior writes a `supersedes: [<list>]` field that `/skills_cleanup` later interprets as a deprecation hint. With `--keep-sources`, that field is omitted.
- `--dry-run` — show the planned merged draft (frontmatter + content outline) and stop without writing.
- `--yes` — skip the interactive accept/edit prompt; write the draft immediately after the dry-run preview.

## Steps

1. **Validate input**
   - Require ≥2 selectors; if fewer, stop with a clear error pointing at `/skills_split` for the opposite operation.
   - Refuse if the same selector appears twice (after normalization).

2. **Refresh remote cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`
   - Checkout `main` (read-only; we never modify the remote cache here).

3. **Resolve selectors**
   - For each selector, locate the source file under `~/.claude/skills-hub/remote/skills/<cat>/<name>/` or `~/.claude/skills-hub/remote/knowledge/<cat>/<slug>.md`.
   - For `@<version>` skill selectors: `git -C <remote> show skills/<name>/v<ver>:skills/<cat>/<name>/SKILL.md` (and `content.md`).
   - On miss: report the selector, list 3 closest matches by edit distance, stop. Do not invent content.

4. **Load + parse**
   - Read each source's frontmatter and body verbatim into memory.
   - Compute: union of `tags`, union of `triggers`, set of categories present, set of versions, source git ref/SHA per entry.

5. **Decide output kind** (`--as` resolution above). If `auto` cannot decide unambiguously (e.g. `--as=auto` with mixed kinds AND user passed `--category=knowledge-only-cat`), stop and ask.

6. **Synthesize the merged draft** (in-memory only at this stage)
   - **Skill output** (`SKILL.md` + `content.md`):
     - `name`: `--name` if given, else derived dominant-theme slug.
     - `description`: one sentence rewritten to cover the union of source intents — do NOT just concatenate source descriptions.
     - `category`: resolved per `--category` rules.
     - `tags`: union, deduped, capped at 8 (drop lowest-frequency first).
     - `triggers`: union, deduped, capped at 6.
     - `version`: `0.1.0-draft`.
     - `source_project`: `merged`.
     - `merged_from`: ordered list `["<kind>:<category>/<name>[@<ver>]", ...]`.
     - `linked_knowledge`: present only if any source was knowledge OR any source skill already had this field; union across sources.
     - `supersedes`: same list as `merged_from` UNLESS `--keep-sources` is set.
     - `content.md` outline (do not just paste — synthesize):
       1. **Problem** — combined problem statement.
       2. **Pattern** — unified recipe; if sources disagree on steps, surface the disagreement under "Variants" rather than picking one silently.
       3. **Example** — one canonical example; if sources had distinct examples worth keeping, list as "Alternative examples" with one-line context each.
       4. **When to use / When not to use** — merged guidance.
       5. **Background** (only if knowledge sources merged in) — short summary of each knowledge source's `Fact` + `Applies when`, with `[from knowledge:<slug>]` attribution per bullet.
       6. **Pitfalls** — union of pitfalls across sources.
       7. **Provenance** — bullet list `- <kind>:<category>/<name> @ <commit-sha-short>` for every source.
   - **Knowledge output** (single `*.md`):
     - Same frontmatter conventions as `/skills_extract_knowledge`'s template (`type: knowledge`, `category`, `confidence`, `source`).
     - `confidence`: minimum across sources (worst case wins; merging a `low` and a `high` yields `low`).
     - `summary`: rewritten one-liner.
     - `merged_from`: same shape as above.
     - Body sections: `## Fact` (synthesized), `## Context / Why`, `## Evidence` (concatenated, deduped, each line keeps its original source attribution), `## Applies when`, `## Counter / Caveats` (union; if any source had no caveats, note "source `<x>` did not document caveats" — don't fabricate).

7. **Dry-run preview** (always shown, even with `--yes`)
   - Render:
     ```
     === skills_merge dry-run ===
     Sources (N):
       1. skill:backend/retry-with-jitter-backoff@v1.2.0     (tags: retry, backoff)
       2. skill:backend/retry-on-5xx                         (tags: retry, http)
       3. knowledge:pitfall/retry-storms-without-jitter      (conf: high)

     Output:
       kind:        skill
       slug:        backend/unified-retry-strategy
       category:    backend
       version:     0.1.0-draft
       merged_from: [3 entries]
       supersedes:  [3 entries]   # (omit-flag: --keep-sources)
       linked_knowledge: [retry-storms-without-jitter]

     Frontmatter:
       <yaml block>

     Content outline:
       - Problem ............... 12 lines
       - Pattern ............... 28 lines (1 Variants subsection)
       - Example ............... 18 lines (+1 Alternative)
       - When to use ........... 6 lines
       - Background ............ 9 lines (1 knowledge source)
       - Pitfalls .............. 11 lines
       - Provenance ............ 3 lines

     Draft path (on persist):
       .skills-draft/backend/unified-retry-strategy/
     ```
   - If `--dry-run` → stop here.
   - Else prompt: `accept / edit-name / edit-category / edit-content / cancel`. `--yes` accepts immediately.

8. **Persist draft**
   - Write under `.skills-draft/<category>/<name>/` (skill) or `.knowledge-draft/<category>/<slug>.md` (knowledge).
   - If draft path already exists: prompt overwrite/rename/cancel (never silently overwrite).
   - Add a sibling note `_MERGE_SOURCES.md` listing each source's path, version, commit SHA, and a one-line rationale. Publish commands ignore files starting with `_`.

9. **Report**
   - Show the final draft path, the slug, the proposed publish command (`/skills_publish --draft=<name>` or `/knowledge_publish --draft=<slug>`).
   - Remind: the source entries on the remote are **not modified**. To formally retire them, publish the merged draft, then run `/skills_cleanup` which will see `supersedes` and propose the deprecation PR.

## Rules

- **Read-only on the remote cache.** Never push, never modify `~/.claude/skills-hub/remote/`. All output goes to drafts.
- **Never auto-publish.** This command stops at draft creation; publishing is a separate, deliberate step.
- **Synthesize, do not concatenate.** A merged draft that is just three source bodies stitched together is a bug — flag and refuse to write if the synthesis step couldn't actually produce a unified Pattern section.
- **Provenance is mandatory.** Every merged draft must carry `merged_from` in frontmatter and a `## Provenance` (skill) or `## Evidence` (knowledge) section listing every source with commit SHA. If any source SHA cannot be resolved, stop.
- **No cross-cleanup.** This command does NOT delete or rewrite the source entries. Deprecation, if any, happens at publish time via the `supersedes` field, and only after the user runs `/skills_cleanup` and approves it.
- **Sanitization** inherits from `/skills_publish`: strip absolute paths, emails, tokens, internal hostnames in the synthesized body before writing the draft.
- **Selector ambiguity is fatal.** If `<category>/<name>` matches both a skill and a knowledge entry, refuse with a message asking the user to add `skill:` or `knowledge:` prefix.
- **Confidence floor for knowledge merges.** Output `confidence` = `min(sources)`. Never upgrade a `low`-confidence source by averaging.

## Examples

```
# Merge three near-duplicate skills into one canonical skill
/skills_merge skill:backend/retry-with-jitter-backoff skill:backend/retry-on-5xx skill:backend/exponential-backoff --name=unified-retry-strategy

# Merge a skill with two knowledge notes; output is a skill carrying linked_knowledge
/skills_merge skill:backend/retry-with-jitter-backoff knowledge:pitfall/retry-storms knowledge:pitfall/thundering-herd

# Merge two knowledge entries into one consolidated note
/skills_merge knowledge:api/idempotency-key-per-tenant knowledge:api/idempotency-key-conflict-resolution --as=knowledge

# Pin to specific skill versions
/skills_merge skill:backend/retry@v1.2.0 skill:backend/retry-on-5xx@v0.3.1 --dry-run

# Auto-everything (still shows preview, then writes)
/skills_merge skill:devops/blue-green-deploy skill:devops/canary-deploy --as=skill --yes
```
