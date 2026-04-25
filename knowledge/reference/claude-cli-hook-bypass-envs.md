---
version: 0.1.0-draft
name: claude-cli-hook-bypass-envs
summary: Three environment variables — `DISABLE_OMC=1`, `OMC_SKIP_HOOKS=*`, `CLAUDE_DISABLE_SESSION_HOOKS=1` — neutralize the oh-my-claudecode harness and Claude's own SessionStart/Stop hooks so a spawned `claude -p` child can run unattended without a parent-side hook printing to stdout or hijacking stdin.
category: reference
confidence: medium
tags: [claude-code, oh-my-claudecode, omc, hooks, env-vars, unattended, spawn, reference]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
linked_skills: [claude-cli-unattended-wrapper, stream-json-assistant-event-router]
---

# Claude CLI Hook Bypass Env Vars

## What the three vars do

| Env var | Turns off | Why it matters for unattended runs |
|---|---|---|
| `DISABLE_OMC=1` | The entire oh-my-claudecode orchestration layer | OMC would otherwise inject `<system-reminder>` tags, swap agents, and gate on hook returns — each of those is a potential deadlock in a scripted spawn |
| `OMC_SKIP_HOOKS=*` | All OMC hooks (comma-separated list; `*` = all) | Even with the layer active, this skip-list suppresses the individual hook scripts. Use when you want *most* of OMC but not specific hooks (e.g. `OMC_SKIP_HOOKS=session-start,status-line`) |
| `CLAUDE_DISABLE_SESSION_HOOKS=1` | Claude Code's own SessionStart / Stop hooks defined in `.claude/settings.json` | Independent of OMC. A project-level hook that tries to read stdin ("Did you mean to commit?") will hang the unattended child |

## Why a hook hangs an unattended child

Hooks run synchronously and can:
- Print to stdout → shows up in the parent's `stream-json` parser as unparseable JSON, polluting the log but usually harmless.
- Read from stdin → **deadlocks** the child because the parent's auto-yes pipe is already consumed by the main prompt. This is the load-bearing failure mode.
- Exit non-zero → blocks the operation the hook is gating (e.g. a `PreToolUse` hook that refuses) and the unattended prompt has no way to override.

Setting all three env vars together is the conservative move: even if you "only" use OMC, a project-level Claude hook in the target working directory can still trip you up.

## Where each is honored

- `DISABLE_OMC` — read by `~/.claude/CLAUDE.md` guards and by OMC hook scripts themselves; universal kill-switch.
- `OMC_SKIP_HOOKS` — honored by the OMC hook dispatcher. Supports comma-separated names or `*`.
- `CLAUDE_DISABLE_SESSION_HOOKS` — read by Claude Code's harness for `SessionStart`/`SessionEnd`. Does **not** disable `PreToolUse`/`PostToolUse` hooks. If you need those off too, set `--dangerously-skip-permissions` (which bypasses permission hooks) and/or temporarily move `.claude/settings.json` aside.

## Pitfalls

- **These vars only work on the spawned child.** Setting them in your shell doesn't help if the Node spawner re-inherits a clean env or another wrapper re-exports them. Pass them explicitly in `spawn({ env: { ...process.env, DISABLE_OMC: '1', ... } })`.
- **`OMC_SKIP_HOOKS=*` is not the same as `DISABLE_OMC=1`.** The latter turns off the whole layer (including context injection, skills, agents). The former only silences hook scripts. For a truly cold unattended run, set all three.
- **They silence logs you might actually want.** If a hook would have warned "this repo has uncommitted changes before `hub-import`", you won't see it. Pair unattended runs with explicit pre-flight checks in the parent script rather than relying on hooks.
- **`PreToolUse` hooks not covered by `CLAUDE_DISABLE_SESSION_HOOKS`.** A `PreToolUse` hook that expects human input will still hang. Audit `.claude/settings.json` in the target dir or fall back to `--dangerously-skip-permissions`.

## When you *don't* want to set these

- Interactive local development — the hooks are a feature, not a bug.
- Security-sensitive pipelines where a `PreToolUse` hook is your last line of defense against an agent running `rm -rf /`. Don't bypass the very thing you installed to catch bad runs.

## Related

- Skill: `claude-cli-unattended-wrapper` — the spawn pattern where these env vars live.
- Knowledge: `dangerously-skip-permissions-for-unattended-loops` — paired trade-off for permission prompts.
