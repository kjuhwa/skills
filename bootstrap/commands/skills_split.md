---
description: Split a single skill or knowledge entry from kjuhwa/skills.git into multiple smaller, focused drafts
argument-hint: <selector> [--by=section|step|concern|auto] [--max=<n>] [--keep-original] [--dry-run] [--yes]
---

# /skills_split $ARGUMENTS

Decompose one oversized or multi-purpose entry from the remote skills repo (`kjuhwa/skills.git`) into N smaller, single-purpose drafts. Each split draft is independent and can be published separately. The original on the remote is **not** modified.

Use when an existing skill has grown to cover multiple distinct procedures, or a knowledge entry conflates several facts that should be looked up independently.

## Selector

Same form as `/skills_merge`:

- `skill:<category>/<name>[@<version>]`
- `knowledge:<category>/<slug>`
- `<category>/<name>` — kind auto-detected; ambiguous selectors are an error.

Exactly **one** selector. To split multiple sources in one shot, use `/skills_refactor`.

## Arguments

- `<selector>` (required) — the entry to split.
- `--by=section|step|concern|auto` — split strategy. Default `auto`.
  - `section`: split by top-level (`##`) headers in `content.md` (skill) or body (knowledge). Each section becomes one draft. Headers `## Problem`, `## Pattern`, `## Example` etc. are kept together as a single skill — the splitter only fires when there are ≥2 *distinct topical* sections (e.g. `## Read path` + `## Write path`).
  - `step`: skill-only — split a numbered procedure into per-step skills. Useful when each step is independently invokable (e.g. a 5-step migration where users sometimes only need step 3).
  - `concern`: split by orthogonal concerns detected in the body — different categories of advice (e.g. "performance" vs "security" vs "observability") become separate drafts. Heuristic: clusters of tags + repeated keywords across paragraphs.
  - `auto`: try `concern` first; if it yields fewer than 2 clean clusters, fall back to `section`; if that also fails, fall back to `step` (skills only). If nothing yields ≥2 splits, refuse with a clear message — the entry doesn't actually need splitting.
- `--max=<n>` — cap the number of resulting drafts. Default `5`. If the strategy would produce more, the smallest groups are merged into a single residual draft slug `<original>-misc` (preview will show this clearly).
- `--keep-original` — record-only flag; the source entry on the remote is not touched regardless. With this flag set, frontmatter omits the `replaces: <original-slug>` hint that `/skills_cleanup` would otherwise use to propose retiring the original.
- `--dry-run` — preview the proposed splits and stop without writing.
- `--yes` — accept the proposed split set without the interactive review step.

## Steps

1. **Refresh remote cache**
   - `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin`. Read-only.

2. **Resolve selector**
   - Same resolution as `/skills_merge` step 3 (including `@<version>` tag resolution for skills).
   - On miss: list 3 closest matches by edit distance, stop.

3. **Load + parse**
   - Read frontmatter + body verbatim.
   - Compute structural inventory:
     - Top-level (`##`) sections + their byte sizes.
     - Numbered/bulleted step lists (`1.`, `- Step:`, etc.).
     - Tag clusters by paragraph (for `concern` strategy).
     - Total body size.

4. **Reject trivially-small inputs**
   - Refuse if the body is `<400` lines AND has fewer than 2 top-level sections AND fewer than 5 steps. Splitting a tiny entry produces noise, not value. Suggest the user edit it directly instead.

5. **Apply strategy**
   - **`section`**:
     - Group `## Problem` / `## Pattern` / `## Example` / `## When to use` / `## Pitfalls` together as the "core" of each split (they form the standard skill template). The splitter operates on **above-template sections** like `## Read path`, `## Write path`, `## Migration mode`, etc.
     - If the input has none of these "topical" extra sections, fall back to next strategy or refuse.
   - **`step`** (skills only):
     - Each numbered step becomes a draft IF the step has its own preconditions / outputs / failure modes spelled out. Steps that are purely sequential glue ("then commit", "then push") get folded into the previous draft.
   - **`concern`**:
     - Cluster paragraphs by dominant tag/keyword. Each cluster of size ≥3 paragraphs becomes a draft.
     - Cross-cluster references stay as `linked_skills` / `linked_knowledge` in frontmatter.
   - **`auto`**: chain as documented above.

6. **Synthesize each split draft**
   - **Skill split** (per child skill):
     - `name`: `<original-name>-<strategy-derived-suffix>` (e.g. `retry-strategy-read-path`, `migration-step-3-backfill`). User can rename in the review prompt.
     - `description`: rewritten one-liner scoped to that split's concern.
     - `category`: inherited from the original unless the split clearly belongs elsewhere (preview will flag suggested category changes for user approval).
     - `tags`: subset of the original's tags relevant to this split + at most 1 new tag derived from the split's heading.
     - `triggers`: subset of the original's triggers; if a trigger doesn't apply to any split, it's kept on the largest split and a warning is logged.
     - `version`: `0.1.0-draft`.
     - `source_project`: `split-from:<original-category>/<original-name>`.
     - `split_from`: `"<kind>:<category>/<name>[@<ver>]"` (single value, not a list).
     - `replaces`: `"<kind>:<category>/<name>"` UNLESS `--keep-original` is set.
     - `siblings`: list of the other split slugs produced in the same run (helps users navigate).
     - `content.md`: the standard template populated from the corresponding source section/cluster. Include a `## See also` block listing siblings.
   - **Knowledge split** (per child entry):
     - Same conventions as `/skills_extract_knowledge` template.
     - `confidence`: inherits from the original — never upgraded by splitting.
     - `summary`: rewritten one-liner per split.
     - `split_from`, `replaces`, `siblings`: as above.
     - `## Evidence`: each split keeps only the evidence lines relevant to its scope; if an evidence line was global, it's duplicated across splits (with a note).

7. **Dry-run preview** (always shown)
   - Render:
     ```
     === skills_split dry-run ===
     Source: skill:backend/retry-strategy@v1.4.0
       body: 612 lines, 4 top-level sections, 7 numbered steps
       chosen strategy: auto → concern (3 clusters, 4 lines residual)

     Proposed splits (3 + 1 residual):
       1. backend/retry-strategy-read-path     (~180 lines, tags: retry, read)
       2. backend/retry-strategy-write-path    (~210 lines, tags: retry, write, idempotency)
       3. backend/retry-strategy-observability (~120 lines, tags: retry, metrics)
       4. backend/retry-strategy-misc          (~ 40 lines, residual under --max=5)

     Frontmatter for split 1:
       <yaml block>

     Cross-links: each split lists the others under `siblings`.
     replaces: skill:backend/retry-strategy   (omit-flag: --keep-original)

     Draft paths (on persist):
       .skills-draft/backend/retry-strategy-read-path/
       .skills-draft/backend/retry-strategy-write-path/
       .skills-draft/backend/retry-strategy-observability/
       .skills-draft/backend/retry-strategy-misc/
     ```
   - If `--dry-run` → stop here.
   - Else prompt per split: `accept / rename / change-category / drop / edit-content` and a final `proceed / cancel`. `--yes` accepts the entire set as-shown.

8. **Persist drafts**
   - Write each accepted split under `.skills-draft/<category>/<name>/` or `.knowledge-draft/<category>/<slug>.md`.
   - Collision: prompt overwrite/rename/skip per draft.
   - Write a sibling note `_SPLIT_SOURCE.md` next to the first draft only (not duplicated per split): records the original selector, commit SHA, strategy used, and the full split list with their paths. Publish commands ignore files starting with `_`.

9. **Report**
   - Show every draft path and the proposed publish command (`/publish_all` is usually the right call for split sets so cross-links land together).
   - Remind: original entry on remote is **not modified**. Use `/skills_cleanup` after publishing to act on the `replaces` hint (proposes deprecation PR).

## Rules

- **Read-only on the remote cache.** Never push, never modify `~/.claude/skills-hub/remote/`.
- **Never auto-publish.** Always stop at draft creation.
- **No silent dropping.** Every paragraph from the source must end up in some split (or in the residual `-misc` draft). If the strategy would orphan content, the preview must surface it for the user to assign.
- **No fabrication.** Splits inherit content from the source; do not invent new examples, pitfalls, or evidence to "round out" a small split. Smaller is fine.
- **Refuse trivial inputs.** Per Step 4. Splitting a 100-line skill is busywork, not value.
- **Inherit confidence (knowledge).** A `low`-confidence source produces `low`-confidence splits. Splitting cannot improve confidence.
- **Sanitization** inherits from `/skills_publish` rules.
- **Selector ambiguity is fatal.** Same as `/skills_merge`.

## Examples

```
# Auto-strategy split of a sprawling skill
/skills_split skill:backend/retry-strategy

# Force per-section split, cap at 4 drafts
/skills_split skill:devops/full-deploy-pipeline --by=section --max=4

# Step-wise split of a numbered procedure (skills only)
/skills_split skill:db/zero-downtime-migration --by=step

# Knowledge split — separate orthogonal facts
/skills_split knowledge:arch/event-sourcing-everything --by=concern --dry-run

# Pin to a specific version
/skills_split skill:backend/retry-strategy@v1.4.0 --by=concern --yes
```
