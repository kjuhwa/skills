---
version: 0.1.0-draft
name: gh-pr-create-cwd-prefix-does-not-stick
description: "`cd <repo> && gh pr create` from Claude Code's Bash tool can fail with 'must first push the current branch to a remote, or use the --head flag' because `gh` doesn't inherit the expected git context. Use explicit `--repo owner/name --head <branch> --base main` flags instead of relying on cwd."
type: knowledge
category: pitfall
source:
  kind: session
  ref: skills-hub bootstrap v2.6.3 PR #1040 creation 2026-04-19
confidence: medium
tags: [gh-cli, pull-request, claude-code-bash-tool, cwd, git-context, automation]
linked_skills: []
---

## Fact

Observed failure:

```bash
cd ~/.claude/skills-hub/remote && gh pr create \
    --title "Bootstrap v2.6.3: ..." \
    --body "..."
# aborted: you must first push the current branch to a remote, or use the --head flag
```

The branch (`bootstrap/release-v2.6.3`) had already been pushed with `git push -u origin` in the preceding command. So "you must first push" is misleading — the real signal is the second half: `gh` couldn't resolve which branch/remote to target from the current git context.

Replacing the invocation with explicit flags works first try:

```bash
gh pr create \
    --repo kjuhwa/skills-hub \
    --head bootstrap/release-v2.6.3 \
    --base main \
    --title "Bootstrap v2.6.3: ..." \
    --body "..."
# https://github.com/kjuhwa/skills-hub/pull/1040
```

No `cd`, no chained `&&`, no dependency on cwd being the git repo.

## Why

Two cooperating factors make the `cd X && gh ...` pattern fragile under Claude Code's Bash tool:

1. **Each Bash tool call runs in a harness-managed shell.** Cross-invocation cwd is reset (the runtime displays a `Shell cwd was reset to <project>` notice after each call). Within a single invocation, `cd X && cmd` should work per standard shell semantics, but depending on how the harness wraps the command (e.g., `bash -c "<your-command>"` vs. a subshell with a pre-set cwd), `cd` may not leak into the child process environment that `gh` inspects.

2. **`gh pr create` reads git state at invocation time** to autofill `--head` (current branch) and `--repo` (from `origin` remote URL). When it runs outside the expected git directory, both lookups fail and it emits the "must push or use --head" error — which reads as "I don't know what branch you mean", not "you're in the wrong directory".

The explicit-flags form sidesteps both issues: nothing depends on cwd, nothing depends on gh's auto-detection, and the command is self-describing when it shows up in a transcript or log.

## How to apply

**Rule**: when automating `gh` from a multi-step script or from Claude Code's Bash tool, prefer explicit flags over cwd-dependent auto-detection.

Replacement patterns:

| Relies on cwd | Explicit equivalent |
|---|---|
| `cd repo && gh pr create ...` | `gh pr create --repo owner/name --head <branch> --base <base> ...` |
| `cd repo && gh pr list ...` | `gh pr list --repo owner/name ...` |
| `cd repo && gh pr view 42` | `gh pr view 42 --repo owner/name` |
| `cd repo && gh pr merge 42 --squash` | `gh pr merge 42 --repo owner/name --squash` |
| `cd repo && git fetch origin` | `git -C repo fetch origin` (use `git -C`, parallels `--repo`) |

For bash-tool-driven automation, the rule of thumb is: **if a command has a `--repo`/`-C`/`--cwd` flag, use it.** Every tool-call being self-contained is worth the extra typing.

## Evidence

Session 2026-04-19, bootstrap/release-v2.6.3 PR creation. First attempt with the `cd && gh` chain failed despite a successful push in the preceding Bash tool call. Second attempt using `--repo --head --base` explicit flags succeeded and returned `https://github.com/kjuhwa/skills-hub/pull/1040`.

The issue was transient (the harness may behave differently in different permission modes), but the fix — always pass `--repo`/`--head` — is robust across all modes.

## Counter / Caveats

- On a plain developer shell (not the Claude Code Bash tool), `cd X && gh pr create` works fine because the shell's cwd is stable across the chain. This pitfall is specific to harnesses that wrap each command in a reset-cwd sandbox.
- `gh` can usually also read `GH_REPO` env var to set the target repo; `GH_REPO=owner/name gh pr create --head <branch>` is another explicit form. Prefer inline flags over env vars in transcripts — env vars are invisible at read time.
- Some gh subcommands (`gh api`, `gh workflow`, `gh issue list`) auto-resolve differently; test the specific subcommand rather than assuming uniform behavior.
- `git -C <path>` is the equivalent explicit pattern for git commands — always prefer it over `cd <path> && git ...` in the same contexts, for the same reasons.
