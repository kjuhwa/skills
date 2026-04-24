---
description: Show a compact summary of the skills hub state — remote cache, installed counts, pending drafts, outdated entries, bootstrap version
argument-hint: [--verbose] [--json]
---

# /hub-status $ARGUMENTS

Quick health check — one screen, no side effects. The `git status` equivalent for the skills hub.

## Output sections

### 1. Remote cache
- Path: `~/.claude/skills-hub/remote/`
- Status: `cached` (with age since last fetch) or `missing` (suggest `/hub-init`).
- Current ref: `main @ <short-sha>`.
- If cache is > 24h old, append `(stale — run /hub-sync)`.

### 2. Installed
- Read `~/.claude/skills-hub/registry.json`.
- Show: `<N> skills, <M> knowledge, <T> techniques` with breakdowns:
  - `global: <n>  project: <m>`
  - `pinned: <p>  outdated: <o>` (outdated = `source_commit` differs from remote HEAD for that entry's path).
  - Techniques are read from the optional `techniques` key in `registry.json` — absence means zero, not an error.
- If registry missing: `[NOT INITIALIZED] — run /hub-init`.

### 3. Drafts
- Scan `.skills-draft/` and `.knowledge-draft/` in cwd.
- Show counts: `<N> skill drafts, <M> knowledge drafts` (exclude `_*` metadata files).
- If any `_published/` archive dirs exist, show count: `<P> published archives`.
- If no draft dirs: `(no draft dirs — run /hub-init to create)`.

### 4. Bootstrap
- Read `~/.claude/skills-hub/bootstrap.json`.
- Show: `commands v<version> (installed <date>)`.
- If remote has a newer `bootstrap/v*` tag: `(update available: v<new> — run /hub-commands-update)`.
- If `bootstrap.json` missing: `[NOT TRACKED]`.

### 5. Quick actions (only show relevant ones)
- `stale cache` → suggest `/hub-sync`
- `outdated skills` → suggest `/hub-sync`
- `pending drafts` → suggest `/hub-publish-all`
- `not initialized` → suggest `/hub-init`
- `bootstrap update` → suggest `/hub-commands-update`

## Compact output example

```
Skills Hub Status
  Remote:     cached (2h ago) — main @ abc1234
  Installed:  124 skills, 87 knowledge, 2 techniques (global: 120/85/2, project: 4/2/0, pinned: 3, outdated: 2)
  Drafts:     2 skill drafts, 1 knowledge draft (3 published archives)
  Bootstrap:  v1.2.0 (installed 2026-04-15) — update available: v1.3.0

  Actions:
    • 2 outdated skills → /hub-sync
    • 3 pending drafts → /hub-publish-all
    • Bootstrap update → /hub-commands-update
```

## Arguments

- `--verbose` — show per-category breakdowns for skills and knowledge, list outdated skill names, list draft file names.
- `--json` — output as JSON (for scripting/piping).

## Rules

- **Read-only.** Never modify any file, registry, or cache.
- **Fast.** No network calls. All data from local filesystem + git log on cached repo.
  - Exception: checking remote bootstrap tags requires the cache to be fetched — if cache is stale, just note it; don't fetch.
- If any section's data source is missing, show a clear `[MISSING]` marker with the fix command — never error out.
- Registry version check: if v1, note `(v1 — run /hub-init to migrate)`.
