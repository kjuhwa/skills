---
version: 0.1.0-draft
name: executor-agent-bash-permission
description: Executor sub-agents may not have Bash tool permissions, causing git/shell operations to fail silently
category: pitfall
tags:
  - agents
  - permissions
  - bash
  - git
  - publishing
---

# Executor Agents May Lack Bash Permissions

## Problem

When spawning `oh-my-claudecode:executor` agents with `run_in_background=true`, the agent may not have permission to use the Bash tool. The agent will attempt to request permission but since it's running in the background, the user prompt is never seen and the agent returns without completing git operations.

## Observed Behavior

- Agent completes file creation (Write tool works)
- Agent fails on `git fetch`, `git checkout`, `git commit`, `git push`, `gh pr create`
- Agent returns a message asking for Bash permission instead of completing the task
- All 3 parallel publish agents failed identically in this session

## Solution

Split work by tool requirements:
- **Delegate to agents**: file creation, code generation, validation logic (Write/Read/Edit tools)
- **Keep in main context**: git operations, shell commands, PR creation (Bash tool)

```
# Good: agents build, main publishes
Agent → build files (Write only)
Main  → git branch + copy + commit + push + PR (Bash)

# Bad: agents try to do everything
Agent → build files + git publish (Bash denied)
```

## Prevention

When designing agent prompts for background execution:
1. Check if the task requires Bash — if yes, either run in foreground or keep Bash steps in main
2. Use `mode: "auto"` or `mode: "bypassPermissions"` only if the user has pre-approved
3. For git publishing workflows, always handle git operations in the orchestrating context
