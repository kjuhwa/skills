---
description: Install every skill and every knowledge entry from kjuhwa/skills.git in one shot
argument-hint: [--global] [--skills-only] [--knowledge-only] [--yes] [--category=<name>]
---

# /hub-install-all $ARGUMENTS

Bulk-install **all** skills and **all** knowledge entries from the central repository.
For targeted installs (keyword / version pinning), use `/hub-install` instead.

## Steps

1. **Ensure remote cache exists**
   - Path: `~/.claude/skills-hub/remote/`
   - If missing: `git clone https://github.com/kjuhwa/skills.git ~/.claude/skills-hub/remote` (full clone — tags required).
   - If present and older than 1h: `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin` then `git pull --ff-only` (run in background if slow).
   - If clone fails (network/auth), report clearly and stop — do NOT fabricate entries.

2. **Parse flags**
   - `--global` → force install into `~/.claude/...` even if `.claude/` exists in cwd.
   - `--skills-only` → skip knowledge.
   - `--knowledge-only` → skip skills.
   - `--category=<name>` → restrict both skills and knowledge to a single category.
   - `--yes` → skip the confirmation prompt in step 5.
   - Mutually exclusive: `--skills-only` and `--knowledge-only`. Error and stop if both are passed.

3. **Enumerate**
   - Skills: read `~/.claude/skills-hub/remote/index.json` → `skills[]`. Fallback to scanning `skills/**/SKILL.md` frontmatter if index missing.
   - Knowledge: read `index.json` → `knowledge[]`. Fallback to scanning `knowledge/**/*.md` frontmatter.
   - **Filter out archived entries.** Skip any entry whose frontmatter (or `index.json` record) has `archived: true`. Report the count of skipped archived entries in the preview (step 4) so the user sees why totals may be lower than the raw inventory.
   - Apply `--category` filter when set.
   - Install from `main` HEAD (no version pinning in bulk mode — use `/hub-install name@version` for pinning).

4. **Preview counts**
   - Show totals grouped by category for both skills and knowledge. Archived entries were already filtered out in step 3; show the excluded counts on their own line so the user can see why totals are below the raw inventory:
     ```
     SKILLS     (124 total, 3 archived excluded)
       arch/ 18   backend/ 42   workflow/ 9   ...
     KNOWLEDGE  (87 total, 2 archived excluded)
       arch/ 31  api/ 5   pitfall/ 22  ...
     ```
   - Also show destination roots:
     - Skills → `~/.claude/skills/<name>/` or `.claude/skills/<name>/`
     - Knowledge → `~/.claude/skills-hub/knowledge/<category>/<file>.md` (global) or `.claude/knowledge/<category>/<file>.md` (project)

5. **Confirm** — prompt user `proceed? [y/N]` unless `--yes` flag is present. Abort on anything other than explicit yes.

6. **Install skills** (unless `--knowledge-only`)
   - Destination root:
     - `--global` flag OR no `.claude/` dir in cwd → `~/.claude/skills/<name>/`
     - else → `.claude/skills/<name>/`
   - For each skill:
     - On name collision: **skip** (log `[SKIP existing] <name>`). Do NOT prompt per-skill in bulk mode — user can re-run `/hub-install <name>` to overwrite individually.
     - Copy entire skill directory (`SKILL.md` + `content.md` + `examples/` + any other files).
     - Update `~/.claude/skills-hub/registry.json` entry with: `category`, `scope`, `installed_at`, `version` (from index), `source_commit` (current `main` HEAD SHA), `pinned: false`.

7. **Install knowledge** (unless `--skills-only`)
   - Destination root:
     - `--global` flag OR no `.claude/` dir in cwd → `~/.claude/skills-hub/knowledge/<category>/`
     - else → `.claude/knowledge/<category>/`
   - For each knowledge file:
     - On collision: skip (log `[SKIP existing] <category>/<file>`).
     - Copy the markdown file as-is (preserve frontmatter including `type: knowledge`, `confidence`, `linked_skills`, `source_project`).
     - Update `registry.json` `knowledge[]` entry with: `slug`, `category`, `scope`, `installed_at`, `source_commit`, `linked_skills`.

8. **Report**
   ```
   SKILLS:    installed=<N>  skipped=<M>  failed=<F>
   KNOWLEDGE: installed=<N>  skipped=<M>  failed=<F>
   Destination: <global|project>
   ```
   - List failures with reason (missing file, permission, etc.).
   - Remind user they may need to restart Claude Code to pick up new skills.

## Rules

- **Always install from `main` branch HEAD.** Never use feature branches (`example/*`, `skill/*`, etc.) — they may contain outdated or unmerged content. All sources must come from the `main` checkout.
- Never modify the remote clone cache's working tree (read-only usage).
- Bulk mode always installs from `main` HEAD — use `/hub-install` for version-pinned installs.
- Collisions are silently **skipped**, not overwritten — this is a bulk-install convenience, not a sync. For overwrites use `/hub-sync` or targeted `/hub-install <name>`.
- **Archived entries** (`archived: true`) are always excluded — there is no `--include-archived` flag in bulk mode. To install an archived entry on purpose, use targeted `/hub-install <name> --include-archived`.
- Registry writes must be atomic (write to temp file, rename) to avoid corruption on partial runs.
- If `--category=<name>` matches zero skills AND zero knowledge, stop with a clear message.
