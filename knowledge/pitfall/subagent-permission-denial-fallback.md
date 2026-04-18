---
version: 0.1.0-draft
name: subagent-permission-denial-fallback
description: "Claude Code subagents (Agent tool) cannot obtain Write/Bash permissions independently — if user hasn't pre-granted them, all 3 agents fail and you must build directly"
type: knowledge
category: pitfall
source:
  kind: session
  ref: session-2026-04-16-hub-make
confidence: high
tags: [claude-code, subagent, permissions, agent-tool, parallel]
---

## Fact

When spawning background agents via the `Agent` tool with `run_in_background: true`, each agent independently requests tool permissions (Write, Bash, etc.). If the user's permission mode requires approval, the background agents cannot prompt the user — they simply fail with "permission denied" and return a message asking for permissions that will never be granted. All 3 parallel agents in this session failed identically.

## Why

The `/hub-make` workflow spawned 3 executor agents to build 3 HTML files in parallel. All 3 returned without writing anything because Write and Bash tools were denied. The total wasted time was ~5 minutes across all agents. The fix: build all 3 files directly in the main context using parallel Write tool calls (which CAN prompt the user).

## How to apply

- **Don't spawn subagents for file creation** unless you know permissions are pre-granted (e.g. `mode: "auto"` or `mode: "bypassPermissions"`)
- For parallel file writes: use multiple `Write` tool calls in a single message — they run in parallel and can each prompt the user
- For parallel reads/searches: subagents work fine since Read/Grep/Glob are typically allowed
- If an agent fails with permission denial, don't retry — build directly in the main context

## Counter / Caveats

This only applies when the user hasn't pre-granted tool permissions. In `bypassPermissions` or `auto` mode, subagents work as expected. The issue is specific to interactive permission modes.
