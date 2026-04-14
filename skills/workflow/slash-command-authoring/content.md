# Slash Command Authoring

## Problem

Slash commands at `.claude/commands/<name>.md` or `~/.claude/commands/<name>.md` run the model through a recipe. Ad-hoc commands without consistent structure lead to:
- Unclear argument handling (`$ARGUMENTS` usage varies).
- Silent destructive operations (no dry-run).
- Unbounded steps the model skips or reorders.
- Missing trigger metadata, so users can't discover them.

## Pattern

### 1. Frontmatter contract

```yaml
---
description: <one sentence, starts with verb, mentions the output>
argument-hint: <typed hint shown in autocomplete, e.g. "<keyword> [--flag]">
---
```

- `description` appears in command listings — make it specific, not "do X related to Y".
- `argument-hint` shows users the expected shape before they invoke.

### 2. Structure the body as a numbered procedure

Use H2 `## Steps` with a numbered list. Each step is imperative and verifiable.

- Avoid "try to ..." — commands should not hedge.
- Keep steps at one level of abstraction (don't mix "read file X" with "design the new module").

### 3. Declare writes explicitly

List any files/directories the command will write, and whether writes are:
- **Local-only** (safe, reversible)
- **Remote** (require dry-run + confirmation)
- **Destructive** (require `--apply` flag + per-item approval)

### 4. Include `## Rules` at the bottom

Safety invariants the model must obey regardless of user phrasing:
- What NEVER to do (force push, skip hooks, push to main).
- Sanitization requirements (strip secrets/paths before output).
- Parallelism hints where relevant.

### 5. Interpolate `$ARGUMENTS` once, near the top

```markdown
# /my_command $ARGUMENTS
```

Then treat it as a parsed value. Don't re-interpolate mid-body — the model can lose track of raw input.

## Example (minimal safe template)

```markdown
---
description: Clean up stale branches locally with dry-run first
argument-hint: [--apply] [--pattern=<glob>]
---

# /prune_branches $ARGUMENTS

## Steps

1. Parse args: default `--pattern=feature/*`, `--apply` off.
2. Run `git branch --merged main` filtered by pattern.
3. Print the deletion list.
4. If `--apply` not set: stop, report "dry-run, pass --apply to delete".
5. If `--apply`: ask user "delete N branches? yes/no" — require explicit yes.
6. On yes: delete one at a time, report each.

## Rules

- Never delete `main`, `master`, or the current branch.
- Never delete branches with unmerged commits.
- Never run without the dry-run print step.
```

## When to Use

- Adding a new slash command that touches git, remote services, or shared files.
- Refactoring an existing command whose steps have drifted.
- Bundling a repeated multi-step workflow (extract → review → publish).

## Pitfalls

- **Over-instructing.** The model follows naturally-written steps. Long nested bullets with "however" and "unless" degrade.
- **No `## Rules` section.** Without invariants, user phrasing ("just do it", "skip the review") overrides your safety intent.
- **Hidden state assumptions.** If the command needs `~/.some-cache/` or a registry file, say so in step 1 and handle missing case.
- **Mixing discovery and mutation.** Split "find candidates" from "apply changes" into separate commands, or at minimum separate numbered phases.
- **Silent failure modes.** Every step that can fail (network, auth, missing file) needs a stated behavior (stop vs continue vs prompt).
