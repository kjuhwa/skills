# Git-Tag-Based Registry Versioning

## Problem

You have a git repo that serves as a registry of reusable assets — Claude Code skills, prompt templates, slash commands, code snippets, AI agent definitions. Users install from it via a "fetch command" that currently pulls `main` HEAD. Two recurring pains:

1. A breaking change lands on `main` and every downstream user's next sync breaks.
2. Users want to pin one asset to a known-good older version without freezing the whole registry.

Without versioning, your only options are branches-per-version (noisy) or telling users to commit-pin (opaque). You need immutable, human-readable version handles that don't interfere with normal main-line development.

## Pattern

Use **annotated git tags with namespaces**. Two tag schemes coexist:

- **Per-item tag**: `<kind>/<name>/v<semver>` — e.g. `skills/kafka-header/v1.2.0`, `prompts/summarizer/v0.3.1`.
- **Per-release-bundle tag**: `<bundle>/v<semver>` — e.g. `bootstrap/v1.0.0` for the slash-command files that ship together as one unit.

The fetch command resolves a ref in this priority:
1. Explicit `--version=x.y.z` → tag `<kind>/<name>/v<version>`
2. `name@version` syntax sugar for the same
3. Default → `main` HEAD (latest)

### Registry schema additions

The local install manifest gains two fields:

```json
{
  "<name>": {
    "source_commit": "<sha>",
    "version": "1.2.0",
    "installed_at": "...",
    "synced_at": "...",
    "pinned": true
  }
}
```

- `pinned: true` when installed via explicit version → bulk sync skips it (unless `--force`).
- `synced_at` separates last-check time from install time for observability.

### Publish flow

The publish command:
1. Reads the current version from the asset's frontmatter or last tag.
2. Applies `--bump=patch|minor|major` (or accepts explicit `--version`).
3. Refuses to overwrite an existing tag (tags are immutable history).
4. Commits the change on a feature branch, creates `git tag -a <namespace>/v<ver>`, pushes both, optionally opens a PR.

### Sync / rollback flow

Same command, three modes:
- **Bulk** (no flags): update every non-pinned item to latest.
- **Targeted** `--name=X --version=Y`: install from the tag, set `pinned: true`. Works forward or backward (rollback).
- **Unpin** `--name=X --unpin`: clear pin so the item tracks latest again.

Downgrades require explicit confirmation because the user is replacing newer content with older.

## Example

Claude Code skills repo. User edits `kafka-header-metadata` skill, bumps minor:

```
# author side
/skills_publish --bump=minor --pr
  → branch skills/add-backend-20260415
  → commit + tag skills/kafka-header-metadata/v1.2.0
  → push branch + tag, open PR

# consumer side
/init_skills kafka-header-metadata@1.1.0    # pin to known-good prior version
  → git fetch --tags
  → git show skills/kafka-header-metadata/v1.1.0:... extracts files
  → registry: {"kafka-header-metadata": {"version":"1.1.0", "pinned":true, ...}}

# later, want latest
/skills_sync --skill=kafka-header-metadata --unpin
/skills_sync
  → picks up v1.2.0
```

## When to use

- Your git repo is a registry, not an application (assets > code).
- Users install by copying files into a local directory, not by `npm install`.
- You want immutable rollback without running a package server.
- Items evolve independently at different cadences → need per-item tags, not global releases.
- Some items ship as a cohesive bundle (e.g. the slash-command set) → bundle tag captures that.

## Pitfalls

- **Shallow clones drop tags.** If your fetch command clones with `--depth=1`, version pinning will silently fail because tags aren't in the object graph. Use full clone, or explicitly `git fetch --tags` after the shallow clone. Document this — it is the #1 bug in first implementations.
- **Don't push tags to `main` without PR merge.** Tags on feature branches are visible to `ls-remote` but only become "real history" once the commit they point at is on main. Communicate this in the publish report so users understand why a v-tag exists but `/sync` doesn't see it yet.
- **Tag namespace collisions.** `<kind>/<name>/v<ver>` must keep `<name>` constrained to `[a-z0-9-]+` — slashes in `<name>` would explode the scheme.
- **Tag overwrites are a footgun.** Always `git ls-remote --tags` before creating to refuse duplicates. Never support `--force-tag`.
- **Registry drift.** If `source_commit` in the local manifest doesn't match any remote commit (e.g. item renamed, history rewritten), treat as untracked and prompt user to reinstall — don't auto-resolve.
- **Bulk sync respects pins.** New maintainers will want `/sync --force` to "just update everything" — keep that gated and loud, because it defeats the pin's purpose.
- **Downgrade ergonomics.** Rolling back may leave the registry entry's `version` field lower than previously. That's correct behavior, but log the downgrade loudly so the user sees it in the summary.
