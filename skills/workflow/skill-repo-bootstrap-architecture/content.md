# Skill Repo Bootstrap Architecture

> Companion: `workflow/slash-command-authoring` covers per-command conventions. This skill is about **repo-level** structure.

## Problem

Anyone maintaining a shared skill/prompt library (for Claude Code, Cursor, Continue, or any LLM-assisted workflow) hits the same structural issues:

- The repo holds skills **and** the scripts to install them, tangled together.
- Contributions go straight to `main` with no review gate.
- Skill names collide across categories; keyword searches return inconsistent results.
- New machines need manual copy-paste to install — no one-line bootstrap.
- "Trial" skills get pushed before ready, polluting the catalog.
- Deprecated skills linger forever because the lifecycle isn't defined.

## Pattern

### Layout: bootstrap and skills in separate top-level dirs

```
<repo-root>/
  bootstrap/
    commands/               # slash-command markdown — one per command
    skills/<umbrella>/      # the hub-level umbrella skill (meta, not content)
    install.sh              # bash installer
    install.ps1             # PowerShell installer
  skills/
    <category>/             # broad categories; fine-grained work via tags
      <skill-name>/
        SKILL.md            # frontmatter: name, desc, category, tags, triggers, version
        content.md          # problem / pattern / example / when-to-use / pitfalls
        examples/           # optional
  CATEGORIES.md             # canonical category list (PR to add new ones)
  index.json                # flat catalog for fast keyword search
  README.md                 # install, workflow, authoring rules
  .gitignore                # must include .skills-draft/
```

**Why separate `bootstrap/` from `skills/`?**
- `bootstrap/` is consumed by the installer once per machine.
- `skills/` is consumed every time a user runs skill-search or skill-install.
- Keeping them in separate top-level dirs means `/skills_search <keyword>` doesn't accidentally match an installer script or a slash-command filename.

### Categories: broad, not deep

Keep **one level** of category. Use tags for everything finer. A nested tree like `skills/backend/java/spring/security/...` kills discoverability.

Rule of thumb: if you catch yourself creating a second subcategory, the right fix is usually another tag.

### Install in one line — client-agnostic

The installer does exactly two things:
1. Copy `bootstrap/commands/*.md` → user's client command dir.
2. Copy `bootstrap/skills/<umbrella>/` → user's client skills dir.

Keep paths configurable via env var, with sensible defaults. For Claude Code:
```bash
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
cp bootstrap/commands/*.md "$CLAUDE_DIR/commands/"
cp -r bootstrap/skills/<umbrella> "$CLAUDE_DIR/skills/"
```

For a different client (Cursor, Continue, your own tool), change the target dir — the repo layout doesn't care.

### Safety gates — bake into every command

| Operation | Default | Override |
|---|---|---|
| Publish to remote | dry-run + per-item confirmation | `--yes` / `--all` |
| Cleanup / dedupe | report-only | `--apply` |
| Push | feature branch `skills/<category>/<name>-<date>` | never direct to `main` |
| Extract | writes to `.skills-draft/` only | gitignored by default |

### Registry on the client (commit-pinned)

Each installed skill gets an entry in a client-side registry, e.g. `~/.claude/<hub>/registry.json`:

```json
{
  "<skill-name>": {
    "category": "...",
    "source_commit": "<sha>",
    "installed_at": "<iso8601>",
    "scope": "project|global",
    "version": "x.y.z"
  }
}
```

Commit-pinning is what makes a `/skills_sync` command useful — it diffs installed vs current remote per skill and decides whether an update is needed. Without it, you're always comparing against "latest", which causes silent overwrites.

### SKILL.md metadata contract

Only the fields that matter at the **repo level**:
- `name`: `[a-z0-9-]+`, unique across the whole repo (not just the category).
- `category`: must exist in `CATEGORIES.md`.
- `version`: semver. Bump on content changes; whitespace-only changes stay on the same version.

For the rest of the frontmatter contract (description-as-retrieval-query, triggers, argument hints), see `workflow/slash-command-authoring`.

### Deprecation lifecycle

Skills rot. Treat removal as a first-class operation, not a silent delete.

1. **Mark deprecated in frontmatter** (don't delete yet):
   ```yaml
   deprecated: true
   deprecated_reason: "Superseded by <new-skill-name>"
   deprecated_since: "2026-03-01"
   ```
2. **Surface in listings**: `/skills_search` shows `[DEPRECATED]` prefix; `/init_skills` refuses to install unless `--allow-deprecated`.
3. **Redirect**: if replaced, add a `REDIRECT.md` in the old skill's dir pointing at the new one.
4. **Remove after grace period**: after N months (e.g. 6), a cleanup PR deletes the directory. `/skills_cleanup --stale-days=<n>` surfaces candidates; humans review the PR.
5. **Never force-delete**: published skills are content other machines pinned by commit SHA. Delete = breakage for syncs.

## Example

Bootstrapping a fresh hub:

```
commit 1  first commit: empty README
commit 2  bootstrap/** + CATEGORIES.md + index.json (empty) + README.md + .gitignore
commit 3  skills/<cat1>/<skill1>/** + skills/<cat2>/<skill2>/**, index.json populated
```

End-user flow after those commits:

```bash
# Install once
git clone <repo> ~/.claude/skill-hub/remote
bash ~/.claude/skill-hub/remote/bootstrap/install.sh
# restart client

# Use
/init_skills apm         # → interactive search + install into ~/.claude/skills/
/skills_list             # → confirms registry entries with source_commit pinned
/skills_sync             # → diffs pinned commit vs remote HEAD, prompts per update
/skills_extract_session  # → writes drafts to project-local .skills-draft/
/skills_publish --pr     # → branch + PR, never direct to main
```

## When to Use

- Starting a shared skill/prompt repo for personal use or a small team.
- Refactoring an ad-hoc "prompts" folder into something discoverable.
- Designing any git-backed registry that ships with its own client commands.
- Retrofitting deprecation onto an existing hub that grew organically.

## Pitfalls

- **Installers inside `skills/`**: they will match keyword searches and confuse users. Keep them in `bootstrap/`.
- **Deep category trees** (`skills/backend/java/spring/...`): kills discoverability. Flatten; use tags.
- **Letting `index.json` drift**: regenerate via a cleanup command on every PR that adds a skill, or a pre-commit hook.
- **Writing content without sanitization**: extracted skills must strip business names, tokens, internal URLs. Enforce in the publish flow, not by author discretion.
- **Direct commits to `main`**: even "tiny fixes" deserve a branch + PR. Friction is the feature.
- **Mixing drafts with published**: `.skills-draft/` belongs only on the authoring machine — never in the shared repo.
- **No versioning**: without semver on `SKILL.md`, `/skills_sync` can't distinguish meaningful changes from whitespace.
- **Silent deletion of published skills**: other clients have pinned the commit — deletion breaks their sync. Use the deprecation lifecycle above.
- **Hardcoding one client's paths**: if the installer only speaks `~/.claude/`, you can't ship to Cursor/Continue users later. Parameterize the target dir.
