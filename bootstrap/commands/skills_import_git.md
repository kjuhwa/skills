---
description: Import skills and/or knowledge from an arbitrary git repository URL as drafts under .skills-draft/ and .knowledge-draft/ (same layout as /skills_extract_project)
argument-hint: <git-url> [--ref=<branch|tag|sha>] [--skills-path=<path>] [--knowledge-path=<path>] [--only=skills|knowledge] [--as-knowledge] [--extract|--no-extract|--extract-only] [--max-skills=<n>] [--max-knowledge=<n>] [--min-confidence=high|medium|low] [--dry-run] [--yes]
---

# /skills_import_git $ARGUMENTS

Fetch skills and knowledge from an external git repository (not `kjuhwa/skills.git`) and stage them as **drafts** under the project's `.skills-draft/` and `.knowledge-draft/` trees, using the **exact same layout** as `/skills_extract_project`.

**No direct installs.** Nothing is written to `~/.claude/skills/`, `.claude/skills/`, `~/.claude/skills-hub/knowledge/`, `.claude/knowledge/`, or `registry.json`. Review the drafts, then ship them with `/skills_publish`, `/knowledge_publish`, or `/publish_all` — exactly like extraction output.

**Pipeline:** `clone → (authored SKILL.md / knowledge *.md found?) → stage as drafts` **OR** `(none found) → /skills_extract_project against the clone → stage drafts in this project`. The second path lets you turn arbitrary source repositories (application code, docs) into publishable drafts.

## Arguments

- `<git-url>` (required) — HTTPS or SSH git URL (e.g. `https://github.com/acme/team-skills.git`).
- `--ref=<ref>` — branch, tag, or commit SHA. Default: `HEAD` of the remote's default branch.
- `--skills-path=<path>` — repo-relative path that contains skills (default: auto-detect `skills/` → `.claude/skills/` → repo root).
- `--knowledge-path=<path>` — repo-relative path for knowledge entries (default: auto-detect `knowledge/` → `.claude/knowledge/`).
- `--only=skills|knowledge` — restrict import to one kind.
- `--as-knowledge` — convert every discovered skill into a **knowledge reference entry** under `.knowledge-draft/reference/<repo-basename>-<name>.md` instead of a skill draft. Use when the external repo's skills overlap with already-installed skills and you only want a comparison reference.
- `--extract` — after the authored-entry scan, **also** run `/skills_extract_project` against the clone and merge its drafts into the candidate list. Use when the external repo has both authored skills AND reusable patterns you want to harvest.
- `--no-extract` — disable the extraction fallback entirely. If no authored SKILL.md / knowledge is found, stop.
- `--extract-only` — skip the authored-entry scan; run `/skills_extract_project` only.
- `--max-skills=<n>` — cap on extracted skill drafts (forwarded to `/skills_extract_project`'s `--max`). Default: 10.
- `--max-knowledge=<n>` — cap on extracted knowledge drafts. Default: 10.
- `--min-confidence=high|medium|low` — drop extracted drafts below this confidence (forwarded). Default: `medium`.
- `--dry-run` — list what would be staged, change nothing.
- `--yes` — skip the interactive selection step (stage everything detected).

**Extraction mode default:** if neither `--extract`, `--no-extract`, nor `--extract-only` is set, the command behaves as **implicit-fallback**: run authored scan first; if it yields zero candidates, automatically run extraction.

## Preconditions

- Must be inside a project directory (a concrete repo, not `$HOME`).
- Ensure `.skills-draft/` and `.knowledge-draft/` exist — create them if missing; add both to `.gitignore`.
- Never write outside these two draft trees at the project root (plus the isolated external clone cache under `~/.claude/skills-hub/external/`).

## Steps

1. **Validate URL**
   - Must match `^(https?://|git@)` and end with `.git` or resolvable path.
   - Reject `file://` and local-directory inputs — use `/skills_extract_project` directly for local projects.
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
     - **No authored entries** AND `--no-extract` set → report what was searched and stop.
     - **No authored entries** AND extraction permitted (default implicit-fallback, `--extract`, or `--extract-only`) → **Step 4a (run extraction)** before enumerating.
     - **Authored entries found** AND `--extract` set → run Step 4a in addition; merge results in Step 5.

4a. **Run extraction fallback (`/skills_extract_project` against the clone)**

   - **Temporary draft output root** (never write inside the clone worktree; it's read-only):
     - `~/.claude/skills-hub/external/<hash>.drafts/` (sibling of the clone cache, not inside it)
     - Create both subfolders: `.skills-draft/` and `.knowledge-draft/` under that root.
     - This temp root is a staging area for extraction output; Step 7 moves its contents into the **current project's** `.skills-draft/` and `.knowledge-draft/`.
   - **Invocation**: execute `/skills_extract_project` with these adjustments:
     - Working directory: `~/.claude/skills-hub/external/<hash>/` (the clone) — so git log / file scans target the external repo.
     - Draft destinations: redirect `.skills-draft/` → `<temp-root>/.skills-draft/` and `.knowledge-draft/` → `<temp-root>/.knowledge-draft/` (pass via env `SKILLS_DRAFT_ROOT`/`KNOWLEDGE_DRAFT_ROOT` if supported, otherwise run in a temp wrapper that symlinks or post-moves).
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
     - Skills: every dir containing `SKILL.md`. Parse frontmatter (`name`, `description`, `category`, `version`, `tags`). If `category` is absent, default to `uncategorized` (the user can refile before publish).
     - Knowledge: every `*.md` under the knowledge path with frontmatter (`name`, `summary`, `category`, `confidence`).
     - Skip entries lacking `name`.
   - **Extracted candidates** (from the `<temp-root>` drafts, if extraction ran):
     - Skills: every dir under `<temp-root>/.skills-draft/<category>/<slug>/` containing `SKILL.md`. Parse frontmatter.
     - Knowledge: every `<temp-root>/.knowledge-draft/<category>/<slug>.md`.
     - Tag each with origin `extracted` for the selection UI.
   - **De-duplication**: if an extracted draft and an authored entry share the same `name`, keep the authored one and mark the extracted entry as "superseded" in the UI so the user can still override.

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
   - `--dry-run` stops after displaying the list (and, if extraction ran, after drafts are written to `<temp-root>`).

7. **Stage as drafts (identical layout to `/skills_extract_project`)**
   - **Skill destinations** (project scope only):
     - Authored: `.skills-draft/<category>/<name>/SKILL.md` (plus any sibling files: `content.md`, `examples/`, etc. — copied verbatim).
     - Extracted: `.skills-draft/<category>/<slug>/SKILL.md` (+ `content.md`).
     - If the authored source has no `category` in its frontmatter, use `uncategorized/` and annotate the SKILL.md with a TODO line.
   - **Knowledge destinations** (project scope only):
     - Authored: `.knowledge-draft/<category>/<slug>.md`.
     - Extracted: `.knowledge-draft/<category>/<slug>.md`.
     - `--as-knowledge` (skills converted to references): `.knowledge-draft/reference/<repo-basename>-<original-name>.md` — see `--as-knowledge` body template below.
   - **Frontmatter injection** (applied to every staged file):
     ```yaml
     source_type: external-git          # or extracted-from-git for Step 4a output
     source_url: <git-url>
     source_ref: <resolved-ref>
     source_commit: <sha>
     source_project: <repo-basename>
     imported_at: <iso8601>
     ```
     Preserve existing fields; add only missing ones. For authored skills that already have a `version`, keep it; for extracted drafts, strip the `-draft` suffix (`0.1.0-draft` → `0.1.0`) and record `version_origin: "extracted"` in the same frontmatter.
   - **Name collision** with existing drafts (same `<category>/<slug>/SKILL.md` or `<category>/<slug>.md`): diff bodies and prompt `overwrite / skip / rename`. No silent clobber.
   - **Cleanup after success**: delete the corresponding file from `<temp-root>` so re-runs don't re-stage. Leave `<temp-root>` behind only if something was skipped.

   ### `--as-knowledge` body template

   When `--as-knowledge` is active, each selected skill becomes:

   - Path: `.knowledge-draft/reference/<repo-basename>-<original-name>.md` (slug sanitized to `[a-z0-9-]+`)
   - Body:
     ```markdown
     ---
     name: <repo-basename>-<original-name>
     summary: External reference — how "<repo-basename>" implements the "<original-name>" skill
     category: reference
     tags: [external-reference, <repo-basename>, <original-name>]
     source_type: external-git
     source_url: <git-url>
     source_ref: <resolved-ref>
     source_commit: <sha>
     source_path: <path-to-SKILL.md-inside-repo>
     confidence: medium
     imported_at: <iso8601>
     ---

     > **External reference — NOT an active skill.** Imported via `/skills_import_git --as-knowledge` as a knowledge draft for comparison. Publish via `/knowledge_publish` or `/publish_all` when ready.

     ## Original SKILL.md

     <verbatim contents of the source SKILL.md>

     ## Additional files (if any)

     - `content.md` (truncated to first 200 lines or 8 KB, whichever is smaller)
     - List of any other files in the source skill directory (names only, not contents)
     ```
   - Collision handling: same diff-and-prompt as other knowledge drafts.

8. **Report**
   - Print a table grouped by kind (skill / knowledge / reference), each row showing: origin (authored/extracted), category, slug, destination path, source ref.
   - Remind the user: "Drafts staged. Run `/publish_all` (or `/skills_publish` / `/knowledge_publish`) to push them to `kjuhwa/skills.git`."
   - Do **not** mention restarting Claude Code — imports are drafts, not active skills, so no runtime reload applies.

## Rules

- **Project drafts only.** Never write to `~/.claude/skills/`, `.claude/skills/`, `~/.claude/skills-hub/knowledge/`, `.claude/knowledge/`, or any registry. The import is always staged under the current project's `.skills-draft/` / `.knowledge-draft/`, identical to `/skills_extract_project`.
- Read-only on the external clone cache's working tree — never push or modify it. Extraction drafts land in `~/.claude/skills-hub/external/<hash>.drafts/` and are moved into the project's draft tree in Step 7.
- Never import from `file://` paths or local directories; require a real remote URL.
- Never auto-stage without an explicit selection unless `--yes`.
- Every staged file carries `source_type`, `source_url`, `source_ref`, `source_commit`, `source_project`, `imported_at` in its frontmatter so downstream `/skills_publish` / `/knowledge_publish` can preserve attribution.
- If both skills and knowledge paths are missing AND `--no-extract` is set, stop rather than importing arbitrary `*.md` files.
- Do NOT add the external URL to `kjuhwa/skills.git` remote configuration; external clones live only under `~/.claude/skills-hub/external/`.
- `--as-knowledge` and `--only=knowledge` are mutually exclusive: the former converts skills into knowledge; the latter skips skills entirely. If both supplied, error out.
- `--as-knowledge` never writes to any `skills/` destination (draft or active) and never touches the registry.
- `--as-knowledge` + `--extract*` combo: extracted skill drafts also get converted into knowledge reference entries (same slug scheme: `<repo-basename>-<original-name>`). Extracted knowledge drafts are staged as normal knowledge drafts (no further conversion).
- Extraction cost awareness: `/skills_extract_project` may spawn `oh-my-claudecode:explore` with `thoroughness=very thorough` against a full repo. For very large repos (>10k files), warn the user and suggest tighter `--max-skills=<n>` / `--max-knowledge=<n>` caps, or use `--no-extract` if they only want the authored scan.
- Extracted drafts keep their `confidence` field from `/skills_extract_project`. The `--min-confidence` flag filters them before the selection UI.
- Name collisions in the project draft tree NEVER silently clobber — always diff and prompt.

## Examples

```
# Authored skills hub — stage verbatim as drafts
/skills_import_git https://github.com/acme/team-skills.git
/skills_import_git https://github.com/acme/team-skills.git --ref=v2.1.0 --only=skills
/skills_import_git git@github.com:acme/kb.git --knowledge-path=docs/knowledge --dry-run
/skills_import_git https://github.com/acme/team-skills.git --yes

# Arbitrary source repo — extraction pipeline
/skills_import_git https://github.com/kjuhwa/scouter                            # implicit-fallback: authored scan finds nothing → extract → review → stage
/skills_import_git https://github.com/kjuhwa/scouter --extract-only --yes       # skip authored scan, auto-stage top extracted drafts
/skills_import_git https://github.com/apache/kafka --extract --max-skills=5 --max-knowledge=10 --min-confidence=high   # big repo, tight caps
/skills_import_git https://github.com/kjuhwa/scouter --no-extract               # stop if no SKILL.md

# Mix
/skills_import_git https://github.com/acme/team-skills.git --extract            # stage authored AND extracted patterns
/skills_import_git https://github.com/kjuhwa/scouter --as-knowledge             # extracted skills become knowledge reference drafts

# After any of the above: publish the drafts
/publish_all                                                                     # or /skills_publish and /knowledge_publish individually
```
