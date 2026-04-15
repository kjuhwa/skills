---
description: Review knowledge drafts and push them to kjuhwa/skills.git as a branch, updating registry.json knowledge section
argument-hint: [--all | --draft=<slug>] [--pr] [--branch=<name>]
---

# /knowledge_publish $ARGUMENTS

Publish `.knowledge-draft/` contents to the remote repository. Counterpart to `/skills_publish` — same flow, but for non-executable knowledge artifacts (facts, decisions, pitfalls, arch notes, domain invariants, API contracts).

## Preconditions

- `~/.claude/skills-hub/registry.json` present and `version >= 2` (knowledge is a v2-only concept). If v1, instruct user to migrate first.
- `~/.claude/skills-hub/remote/` initialized as a git clone of `kjuhwa/skills.git`.
- `.knowledge-draft/` directory exists in cwd with at least one `*.md` file under `<category>/`.

## Steps

1. **Enumerate drafts** in `.knowledge-draft/<category>/*.md` (non-recursive past category).
   - If none: report and stop.
   - Skip any file starting with `_` (e.g. `_DUPLICATE_CHECK.md`).
   - Validate each file has `type: knowledge`-compatible frontmatter (`name`, `description`, `category`, `source`, `confidence`). Flag `[MALFORMED]` and exclude from publish set.

2. **Dry-run review** (always first)
   - For each draft, show:
     - Target path in remote: `knowledge/<category>/<slug>.md`
     - Frontmatter (name, category, confidence, source.ref, linked_skills, tags)
     - Body preview (first 40 lines, skipping frontmatter)
     - Collision status:
       - Exact path already in remote → `[UPDATE]` (content overwrite).
       - Similar name / same `summary` field elsewhere → `[NEAR-DUPLICATE]`, prompt to merge or rename.
       - New path → `[NEW]`.
   - Ask user per draft: publish / skip / edit-first / delete-draft.
   - `--all` auto-selects publish for all well-formed drafts (still shows dry-run).
   - `--draft=<slug>` limits the set to a single entry.

3. **Branch + commit in remote cache**
   - Ensure `~/.claude/skills-hub/remote` is on latest main: `git fetch && git checkout main && git reset --hard origin/main`.
   - Create branch: `--branch=<name>` OR auto `knowledge/add-<primary-category>-<YYYYMMDD>`.
   - Copy approved drafts into `knowledge/<category>/<slug>.md`.
   - **Confidence & source validation per entry**:
     - `confidence` must be one of `high | medium | low`.
     - `source.kind` must be one of `commit | project | session | manual`.
     - `source.ref` must be non-empty.
     - If `Counter / Caveats` / rationale section is missing from the body, cap confidence at `medium` (rewrite frontmatter if needed).
   - Rebuild `knowledge` section of `registry.json`:
     - Key = `<slug>` (filename without `.md`).
     - Fields: `category`, `scope: global`, `path`, `source`, `confidence`, `linked_skills`, `tags`, `extracted_at` (today's date).
     - Preserve existing entries for files not being updated; merge over conflicts.
   - Commit per knowledge entry with message: `Add knowledge/<category>/<slug>: <summary>` (use `Update` verb for overwrites). Include `registry.json` update in the same commit as the file it describes.

4. **Push + PR** (requires confirmation)
   - `git push -u origin <branch>`.
   - **No version tags** — knowledge entries are not versioned (unlike skills). Content is the contract; history is the trail.
   - If `--pr` flag and `gh` CLI available: `gh pr create --title "Add <N> knowledge entries (<categories>)" --body ...` using each draft's `description` + `source_project`.
   - Otherwise print the branch name and compare URL.

5. **Cleanup drafts**
   - Move published drafts to `.knowledge-draft/_published/<date>/` (preserve for reference; don't delete).

## Rules

- **Never push to `main` directly.** Always a feature branch.
- **Never skip the dry-run step.**
- Respect repo's commit style — check `git log --oneline -20` in the cache first to match format.
- Sanitize before copy: strip absolute paths, emails, tokens, internal hostnames, business names from the body. If sanitization would gut the entry, flag for manual edit instead.
- Don't cross-publish: knowledge drafts only. Skill drafts in `.skills-draft/` are ignored here — use `/skills_publish` or `/publish_all` for those.
- If `linked_skills` references a skill not present in `registry.json`, warn but do not block (skill may land in a sibling PR).
- If remote push fails (auth), report precisely and leave branch intact locally for retry.
- Do not include draft metadata files (`_DUPLICATE_CHECK.md`, `_new-categories.md`, files starting with `_`) in commits.

## Frontmatter contract (what we validate and persist)

```yaml
---
name: <slug>                    # required; kebab-case; matches filename
description: <one-line>         # required; used in dry-run and PR body
category: api|arch|pitfall|decision|domain   # required
source:
  kind: commit|project|session|manual        # required
  ref: <commit-sha|project@sha|session-id|"manual">   # required
confidence: high|medium|low     # required; capped to medium if no Counter/Caveats
linked_skills: [<skill-slug>]   # optional; surfaces cross-links in registry
tags: [<keyword>, ...]          # optional; fuels knowledge_search
---
```

Body convention (not enforced, but preferred):

```
**Fact:** ...
**Why:** ...
**How to apply:** ...
**Evidence:** ...
(optional) **Counter / Caveats:** ...
```
