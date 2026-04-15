---
description: Import skills and/or knowledge from an arbitrary git repository URL into the local skills hub
argument-hint: <git-url> [--ref=<branch|tag|sha>] [--skills-path=<path>] [--knowledge-path=<path>] [--global] [--only=skills|knowledge] [--as-knowledge] [--dry-run] [--yes]
---

# /skills_import_git $ARGUMENTS

Fetch skills and knowledge from an external git repository (not `kjuhwa/skills.git`) and install them into the local skills hub.

## Arguments

- `<git-url>` (required) — HTTPS or SSH git URL (e.g. `https://github.com/acme/team-skills.git`).
- `--ref=<ref>` — branch, tag, or commit SHA. Default: `HEAD` of the remote's default branch.
- `--skills-path=<path>` — repo-relative path that contains skills (default: auto-detect `skills/` → `.claude/skills/` → repo root).
- `--knowledge-path=<path>` — repo-relative path for knowledge entries (default: auto-detect `knowledge/` → `.claude/knowledge/`).
- `--only=skills|knowledge` — restrict import to one kind.
- `--as-knowledge` — convert every discovered skill into a **knowledge reference entry** instead of installing it as an active skill. Use this when the external repo's skills overlap with already-installed skills (e.g. OMC plugin skills) and you only want a comparison reference. Implies read-only; nothing under `~/.claude/skills/` or `.claude/skills/` is touched.
- `--global` — install into `~/.claude/...` even when a project `.claude/` exists.
- `--dry-run` — list what would be imported, change nothing.
- `--yes` — skip the interactive selection step (import everything detected).

## Steps

1. **Validate URL**
   - Must match `^(https?://|git@)` and end with `.git` or resolvable path.
   - If empty or malformed, stop with a clear error.

2. **Stage clone in isolated cache**
   - Hash URL: `sha1(url)[:10]` → `<hash>`.
   - Cache path: `~/.claude/skills-hub/external/<hash>/`.
   - If missing: `git clone --filter=blob:none <url> <cache>` (partial clone; full clone if blobless fails).
   - If present: `git -C <cache> fetch --tags --prune origin` then checkout requested ref.
   - On clone/auth failure: report the git error verbatim and stop. Do NOT invent content.

3. **Checkout ref**
   - Default ref: remote HEAD (`git -C <cache> symbolic-ref refs/remotes/origin/HEAD`).
   - Explicit ref: `git -C <cache> checkout --detach <ref>`. Verify it resolves.

4. **Detect layout**
   - Skills path resolution order (first hit wins unless `--skills-path` given):
     1. `skills/` (directories containing `SKILL.md`)
     2. `.claude/skills/`
     3. repo root (if it contains `SKILL.md` entries at depth ≤ 2)
   - Knowledge path order: `knowledge/` → `.claude/knowledge/`.
   - If neither found: report what was searched and stop.

5. **Enumerate candidates**
   - Skills: every dir containing `SKILL.md`. Parse frontmatter (`name`, `description`, `category`, `version`, `tags`).
   - Knowledge: every `*.md` under the knowledge path with frontmatter (`name`, `summary`, `category`, `confidence`).
   - Skip entries lacking `name`.

6. **Present selection**
   - Grouped output:
     ```
     Skills (N):
       [1] <category>/<name> v<version> — <description>
       ...
     Knowledge (M):
       [K1] <category>/<name> (conf=<c>) — <summary>
       ...
     ```
   - Ask user: numbers, `all`, `skills`, `knowledge`, or `cancel`.
   - `--yes` skips the prompt and selects `all`.
   - `--dry-run` stops after displaying the list.

7. **Install**
   - **Destination scope**:
     - `--global` OR no project `.claude/` → `~/.claude/skills/<name>/` and `~/.claude/skills-hub/knowledge/<category>/<name>.md`
     - else → `.claude/skills/<name>/` and `.claude/knowledge/<category>/<name>.md`
   - **Name collision**: diff existing vs incoming SKILL.md; prompt overwrite/skip/rename. For knowledge, diff the file body; same prompt.
   - Copy entire skill directory (SKILL.md + content.md + examples/) or knowledge file.

   ### `--as-knowledge` mode (skills become reference entries)

   When `--as-knowledge` is set, **do not** copy any SKILL.md to a skills destination. Instead, for each selected skill produce one knowledge file:

   - Derive a slug: `<repo-basename>-<original-skill-name>` (e.g. `oh-my-claudecode-autopilot`). Sanitize to `[a-z0-9-]+`.
   - Destination:
     - `--global` or no project `.claude/` → `~/.claude/skills-hub/knowledge/reference/<slug>.md`
     - else → `.claude/knowledge/reference/<slug>.md`
   - File body:
     ```markdown
     ---
     name: <slug>
     summary: External reference — how "<repo-basename>" implements the "<original-name>" skill
     category: reference
     tags: [external-reference, <repo-basename>, <original-name>]
     source_url: <git-url>
     source_ref: <resolved-ref>
     source_commit: <sha>
     source_path: skills/<original-name>/SKILL.md
     confidence: medium
     imported_at: <iso8601>
     ---

     > **External reference — NOT an active skill.** Imported via `/skills_import_git --as-knowledge` for comparison/learning. Claude's skill loader will not auto-discover it.

     ## Original SKILL.md

     <verbatim contents of the source SKILL.md>

     ## Additional files (if any)

     - `content.md` (truncated to first 200 lines or 8 KB, whichever is smaller)
     - List of any other files in the source skill directory (names only, not contents)
     ```
   - Collision handling: if `<slug>.md` already exists, diff bodies and prompt overwrite/skip/rename, same as regular knowledge import.
   - Do **not** write to the skill registry (`~/.claude/skills-hub/registry.json`); these are knowledge, not installed skills.
   - Log each imported path in the final report with a `[knowledge]` marker.

8. **Update registry**
   - For each installed skill, write to `~/.claude/skills-hub/registry.json`:
     ```json
     {
       "<name>": {
         "category": "<cat>",
         "scope": "project|global",
         "installed_at": "<iso8601>",
         "version": "<version or 'external'>",
         "source_type": "external-git",
         "source_url": "<git-url>",
         "source_ref": "<resolved-ref>",
         "source_commit": "<sha>",
         "pinned": true
       }
     }
     ```
   - `pinned: true` because external sources must not be silently overwritten by `/skills_sync` (which targets `kjuhwa/skills.git`).

9. **Report**
   - List installed items with their local paths and source ref.
   - Remind the user to restart Claude Code to pick up new skills.

## Rules

- Read-only on the external clone cache's working tree — never push or modify.
- Never import from `file://` paths or local directories; require a real remote URL (use `/skills_extract` for local projects).
- Never auto-install without an explicit selection unless `--yes`.
- External skills are always pinned — `/skills_sync` must skip `source_type: external-git` entries unless `--force` is passed with the original URL.
- If both skills and knowledge paths are missing, stop rather than importing arbitrary `*.md` files.
- Do NOT add the external URL to `kjuhwa/skills.git` remote configuration; external clones live only under `~/.claude/skills-hub/external/`.
- `--as-knowledge` and `--only=knowledge` are mutually exclusive: the former converts skills into knowledge; the latter skips skills entirely. If both supplied, error out.
- `--as-knowledge` never writes to the skill registry and never creates files under any `skills/` destination.

## Examples

```
/skills_import_git https://github.com/acme/team-skills.git
/skills_import_git https://github.com/acme/team-skills.git --ref=v2.1.0 --only=skills
/skills_import_git git@github.com:acme/kb.git --knowledge-path=docs/knowledge --dry-run
/skills_import_git https://github.com/acme/team-skills.git --global --yes
```
