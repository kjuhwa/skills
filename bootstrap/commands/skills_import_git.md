---
description: Import skills and/or knowledge from an arbitrary git repository URL into the local skills hub; falls back to /skills_extract_project when no authored entries are found
argument-hint: <git-url> [--ref=<branch|tag|sha>] [--skills-path=<path>] [--knowledge-path=<path>] [--global] [--only=skills|knowledge] [--as-knowledge] [--extract|--no-extract|--extract-only] [--max-skills=<n>] [--max-knowledge=<n>] [--min-confidence=high|medium|low] [--dry-run] [--yes]
---

# /skills_import_git $ARGUMENTS

Fetch skills and knowledge from an external git repository (not `kjuhwa/skills.git`) and install them into the local skills hub.

**Pipeline:** `clone → (authored SKILL.md / knowledge *.md found?) → copy-install` **OR** `(none found) → /skills_extract_project against the clone → review drafts → publish-install`. The second path lets you turn arbitrary source repositories (application code, docs) into hub-registered skills + knowledge.

## Arguments

- `<git-url>` (required) — HTTPS or SSH git URL (e.g. `https://github.com/acme/team-skills.git`).
- `--ref=<ref>` — branch, tag, or commit SHA. Default: `HEAD` of the remote's default branch.
- `--skills-path=<path>` — repo-relative path that contains skills (default: auto-detect `skills/` → `.claude/skills/` → repo root).
- `--knowledge-path=<path>` — repo-relative path for knowledge entries (default: auto-detect `knowledge/` → `.claude/knowledge/`).
- `--only=skills|knowledge` — restrict import to one kind.
- `--as-knowledge` — convert every discovered skill into a **knowledge reference entry** instead of installing it as an active skill. Use this when the external repo's skills overlap with already-installed skills (e.g. OMC plugin skills) and you only want a comparison reference. Implies read-only; nothing under `~/.claude/skills/` or `.claude/skills/` is touched.
- `--extract` — after the authored-entry scan, **also** run `/skills_extract_project` against the clone and merge its drafts into the candidate list. Use when the external repo has both authored skills AND reusable patterns you want to harvest.
- `--no-extract` — disable the extraction fallback entirely. If no authored SKILL.md / knowledge is found, stop (legacy behavior prior to v2 of this command).
- `--extract-only` — skip the authored-entry scan; run `/skills_extract_project` and present only extracted drafts.
- `--max-skills=<n>` — cap on extracted skill drafts (forwarded to `/skills_extract_project`'s `--max`). Default: 10.
- `--max-knowledge=<n>` — cap on extracted knowledge drafts. Default: 10.
- `--min-confidence=high|medium|low` — drop extracted drafts below this confidence (forwarded). Default: `medium`.
- `--global` — install into `~/.claude/...` even when a project `.claude/` exists.
- `--dry-run` — list what would be imported, change nothing.
- `--yes` — skip the interactive selection step (import everything detected).

**Extraction mode default:** if neither `--extract`, `--no-extract`, nor `--extract-only` is set, the command behaves as **implicit-fallback**: run authored scan first; if it yields zero candidates, automatically run extraction. This is what makes the "clone + extract + publish" intent work for repos that were never designed as a skills hub (e.g. application source).

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
   - Branching on results:
     - **Authored entries found** AND `--extract-only` not set → Step 5 (enumerate authored).
     - **No authored entries** AND `--no-extract` set → report what was searched and stop (legacy behavior).
     - **No authored entries** AND extraction permitted (default implicit-fallback, `--extract`, or `--extract-only`) → **Step 4a (run extraction)** before enumerating.
     - **Authored entries found** AND `--extract` set → run Step 4a in addition; merge results in Step 5.

4a. **Run extraction fallback (`/skills_extract_project` against the clone)**

   - **Draft output root** (never write inside the clone worktree; Rules say it's read-only):
     - `~/.claude/skills-hub/external/<hash>.drafts/` (sibling of the clone cache, not inside it)
     - Create both subfolders: `.skills-draft/` and `.knowledge-draft/` under that root.
   - **Invocation**: execute `/skills_extract_project` with these adjustments:
     - Working directory: `~/.claude/skills-hub/external/<hash>/` (the clone) — so git log / file scans target the external repo.
     - Draft destinations: redirect `.skills-draft/` → `<drafts-root>/.skills-draft/` and `.knowledge-draft/` → `<drafts-root>/.knowledge-draft/` (pass via env `SKILLS_DRAFT_ROOT`/`KNOWLEDGE_DRAFT_ROOT` if supported, otherwise run in a temp wrapper that symlinks or post-moves).
     - Forward flags: `--max=<max-skills>` (default 10), `--auto-split`, `--min-confidence=<min-confidence>` (default `medium`). If `--only=knowledge` → append `--only knowledge`; if `--only=skills` → append `--only skill`.
     - `--dry-run` on the outer command → also pass `--dry-run` through to extraction (no drafts written).
   - **Source annotation**: every draft file gets frontmatter fields stamped by this step:
     ```yaml
     source_type: extracted-from-git
     source_url: <git-url>
     source_ref: <resolved-ref>
     source_commit: <sha>
     source_project: <repo-basename>
     ```
     If `/skills_extract_project` already wrote `source_project`, overwrite with `<repo-basename>` for consistency across imports.
   - **Failure handling**: if extraction errors or produces zero drafts, report the outcome and fall through to Step 5 with the authored list (possibly empty). Do not hard-fail the import.

5. **Enumerate candidates**
   - **Authored candidates** (from Step 4 paths inside the clone):
     - Skills: every dir containing `SKILL.md`. Parse frontmatter (`name`, `description`, `category`, `version`, `tags`).
     - Knowledge: every `*.md` under the knowledge path with frontmatter (`name`, `summary`, `category`, `confidence`).
     - Skip entries lacking `name`.
   - **Extracted candidates** (from Step 4a drafts root, if extraction ran):
     - Skills: every dir under `<drafts-root>/.skills-draft/<category>/<slug>/` containing `SKILL.md`. Parse frontmatter.
     - Knowledge: every `<drafts-root>/.knowledge-draft/<category>/<slug>.md`.
     - Tag each with origin `extracted` for the selection UI.
   - **De-duplication**: if an extracted draft and an authored entry share the same `name`, keep the authored one and downgrade the extracted entry to a hidden "superseded" note (still listed, but marked, so the user can choose to overwrite).

6. **Present selection**
   - Grouped output, with `[authored]` / `[extracted]` origin tags:
     ```
     Skills (N):
       [1]  [authored]  <category>/<name> v<version> — <description>
       [2]  [extracted] <category>/<name> (conf=<c>) — <description>
       ...
     Knowledge (M):
       [K1] [authored]  <category>/<name> (conf=<c>) — <summary>
       [K2] [extracted] <category>/<name> (conf=<c>) — <summary>
       ...
     ```
   - Ask user: numbers, `all`, `skills`, `knowledge`, `authored`, `extracted`, or `cancel`.
   - `--yes` skips the prompt and selects `all`.
   - `--dry-run` stops after displaying the list (and, if extraction ran, after drafts are written to `<drafts-root>`).

7. **Install**
   - **Destination scope**:
     - `--global` OR no project `.claude/` → `~/.claude/skills/<name>/` and `~/.claude/skills-hub/knowledge/<category>/<name>.md`
     - else → `.claude/skills/<name>/` and `.claude/knowledge/<category>/<name>.md`
   - **Name collision**: diff existing vs incoming SKILL.md; prompt overwrite/skip/rename. For knowledge, diff the file body; same prompt.
   - **Authored entries**: copy entire skill directory (SKILL.md + content.md + examples/) or knowledge file verbatim.
   - **Extracted entries** (from Step 4a drafts):
     - Before copying, verify frontmatter has `source_type: extracted-from-git`, `source_url`, `source_commit`, `source_project`. If missing, inject (Step 4a guarantees this but double-check).
     - Upgrade draft version: `0.1.0-draft` → `0.1.0` (strip `-draft` suffix). Record `version_origin: "extracted"` so the registry can flag it.
     - Copy into the same destinations as authored entries.
     - After a successful install, delete the draft from `<drafts-root>` to avoid re-installation on a future run. If install is aborted, keep the draft for resume.

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
         "source_type": "external-git" | "extracted-from-git",
         "source_url": "<git-url>",
         "source_ref": "<resolved-ref>",
         "source_commit": "<sha>",
         "source_project": "<repo-basename>",
         "pinned": true
       }
     }
     ```
   - `source_type`:
     - `"external-git"` for authored entries copied verbatim from the external repo.
     - `"extracted-from-git"` for entries produced by the Step 4a extraction fallback. Kept distinct so `/skills_sync`, `/skills_list`, and future audit tooling can tell "someone wrote this skill" from "we inferred this skill from source code".
   - `pinned: true` for both — external and extracted sources must not be silently overwritten by `/skills_sync` (which targets `kjuhwa/skills.git`).
   - For knowledge entries, no registry write is performed (knowledge files are filesystem-only, same as `/skills_extract_project` behavior); the `source_*` fields live in the knowledge file's own frontmatter.

9. **Report**
   - List installed items with their local paths and source ref.
   - Remind the user to restart Claude Code to pick up new skills.

## Rules

- Read-only on the external clone cache's working tree — never push or modify. Extraction drafts MUST land in `~/.claude/skills-hub/external/<hash>.drafts/`, never inside the clone itself.
- Never import from `file://` paths or local directories; require a real remote URL (use `/skills_extract` or `/skills_extract_project` directly for local projects).
- Never auto-install without an explicit selection unless `--yes`.
- External and extracted skills are always pinned — `/skills_sync` must skip both `source_type: external-git` and `source_type: extracted-from-git` entries unless `--force` is passed with the original URL.
- If both skills and knowledge paths are missing AND `--no-extract` is set, stop rather than importing arbitrary `*.md` files.
- Do NOT add the external URL to `kjuhwa/skills.git` remote configuration; external clones live only under `~/.claude/skills-hub/external/`.
- `--as-knowledge` and `--only=knowledge` are mutually exclusive: the former converts skills into knowledge; the latter skips skills entirely. If both supplied, error out.
- `--as-knowledge` never writes to the skill registry and never creates files under any `skills/` destination.
- `--as-knowledge` + `--extract*` combo: extracted skill drafts also get converted into knowledge reference entries (same slug scheme: `<repo-basename>-<original-skill-name>`). Extracted knowledge drafts are installed as normal knowledge (no further conversion).
- Extraction cost awareness: `/skills_extract_project` may spawn `oh-my-claudecode:explore` with `thoroughness=very thorough` against a full repo. For very large repos (>10k files), warn the user and suggest `--max-skills=<n>`/`--max-knowledge=<n>` tighter caps, or use `--no-extract` if they only want the authored scan.
- Extracted drafts keep their `confidence` field from `/skills_extract_project`. The `--min-confidence` flag filters them before the selection UI.

## Examples

```
# Authored skills hub — legacy behavior
/skills_import_git https://github.com/acme/team-skills.git
/skills_import_git https://github.com/acme/team-skills.git --ref=v2.1.0 --only=skills
/skills_import_git git@github.com:acme/kb.git --knowledge-path=docs/knowledge --dry-run
/skills_import_git https://github.com/acme/team-skills.git --global --yes

# Arbitrary source repo — extraction pipeline (intent: "clone + extract + publish")
/skills_import_git https://github.com/kjuhwa/scouter                            # implicit-fallback: authored scan finds nothing → extract → review → install
/skills_import_git https://github.com/kjuhwa/scouter --extract-only --yes       # skip authored scan entirely, auto-install top extracted drafts
/skills_import_git https://github.com/apache/kafka --extract --max-skills=5 --max-knowledge=10 --min-confidence=high   # big repo, tight caps
/skills_import_git https://github.com/kjuhwa/scouter --no-extract               # legacy: stop if no SKILL.md

# Mix
/skills_import_git https://github.com/acme/team-skills.git --extract            # import authored AND extract any additional patterns
/skills_import_git https://github.com/kjuhwa/scouter --as-knowledge             # extracted skills become knowledge reference entries
```
