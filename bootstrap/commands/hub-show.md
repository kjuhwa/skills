---
description: Display the full content of an installed skill or knowledge entry — SKILL.md, content.md, or knowledge body
argument-hint: <name> [--remote] [--version=<x.y.z>] [--raw] [--section=<name>]
---

# /hub-show $ARGUMENTS

Quick-read a skill or knowledge entry without hunting for file paths. Works on both local installs and remote entries.

## Resolution order

1. **Exact slug match** in `~/.claude/skills-hub/registry.json` (skills first, then knowledge).
2. **Partial match** — if the input is a substring of exactly one slug, use it. If ambiguous (multiple matches), list them and stop.
3. **Prefix match** — `skill:<slug>` or `knowledge:<slug>` to disambiguate when both kinds share a name.
4. **`--remote`** — skip local, search the remote cache (`~/.claude/skills-hub/remote/`) instead.

## What it shows

### For skills

```
=== retry-with-jitter-backoff (skill) ===
Category:  backend
Version:   v1.2.0 (pinned)
Scope:     global (~/.claude/skills/retry-with-jitter-backoff/)
Tags:      [retry, backoff, resilience]
Triggers:  [retry, backoff pattern]
Installed: 2026-04-10
Source:    abc1234

--- SKILL.md ---
<frontmatter + description>

--- content.md ---
<full body, or first 100 lines with --section filter>
```

### For knowledge

```
=== oauth-token-refresh-strategy (knowledge) ===
Category:    api
Confidence:  medium
Scope:       global (~/.claude/skills-hub/knowledge/api/oauth-token-refresh-strategy.md)
Linked:      [oauth-setup]
Tags:        [oauth, token, refresh]

--- Body ---
## Fact
...
## Applies when
...
```

## Arguments

- `<name>` (required) — slug, partial slug, or `skill:<slug>` / `knowledge:<slug>`.
- `--remote` — read from the remote cache instead of local installs. Useful for previewing before `/hub-install`.
- `--version=<x.y.z>` — show a specific tagged version from remote (`git show skills/<name>/v<ver>:...`). Implies `--remote`.
- `--raw` — output the file content only, no header/metadata chrome. Useful for piping.
- `--section=<name>` — show only a specific `## <name>` section from the body (e.g. `--section=Pattern`, `--section=Fact`). Case-insensitive.

## Steps

1. **Parse input** — extract slug, kind prefix, flags.
2. **Resolve** — find the entry per resolution order above.
3. **Read** — load the file(s) from local path or remote cache.
4. **Render** — show metadata header + file content (respecting `--raw` and `--section`).
5. **Append `Cited by` block** (skipped under `--raw`) — open `~/.claude/skills-hub/remote/citations.json`, look up the key `<kind>/<ref>` for the resolved entry, and render the `cited_by` list:

   ```
   --- Cited by ---
   technique  workflow/safe-bulk-pr-publishing  · role: orchestrator    · via: composes
   paper      workflow/parallel-dispatch-breakeven-point  · role: counter-evidence  · via: examines
   paper      workflow/parallel-dispatch-breakeven-point  · role: gate-input  · via: requires:parallel-dispatch-coverage-gate
   ```

   - Group by kind (`technique` first, then `paper`); within a kind sort by ref.
   - Show at most 8 entries; tail the rest as `… and N more`.
   - If the atom has zero citations, render `--- Cited by ---  (none yet)`. This is informative — uncited atoms are exactly what `paper/arch/technique-layer-roi-after-100-pilots` is measuring.
   - If `citations.json` is missing or older than the entry's last modification, advise `precheck.py` (the post-merge / post-commit hook regenerates it automatically).

## Rules

- **Read-only.** Never modify any file.
- On zero matches: suggest `/hub-search-skills <name>` or `/hub-list-skills` to find the right slug.
- On ambiguous matches: list all candidates with their kind and category, ask user to be more specific.
- If the entry is tracked in registry but the file is missing: report `[FILE MISSING]` and suggest `/hub-doctor`.
- Truncate `content.md` at 200 lines by default in non-raw mode; show `(truncated — use --raw for full)` footer. `--raw` shows everything.
- For `--remote --version`: if the tag doesn't exist, list available versions via `git tag -l "skills/<name>/v*"`.
