---
name: claudecode-env-breaks-nested-spawn
summary: Claude Agent SDK's nesting guard sees CLAUDECODE=1 in a child process env and refuses to run — must strip before spawn when your CLI runs inside another Claude session.
category: pitfall
tags: [claude-agent-sdk, env-vars, nesting, subprocess]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/cli/src/server-spawner.ts
imported_at: 2026-04-18T00:00:00Z
---

# Don't inherit CLAUDECODE when spawning an SDK subprocess

### Situation
You have a CLI (craft-cli) that spawns a headless server that uses the Claude Agent SDK. Sometimes users run your CLI from INSIDE a Claude Code session (e.g. `claude-code` terminal). Then:

- Parent shell has `CLAUDECODE=1` (set by Claude Code).
- Your CLI does `Bun.spawn(['bun', 'run', 'server.ts'], { env: process.env, ... })`.
- Server imports `@anthropic-ai/claude-agent-sdk`.
- SDK's "nesting guard" sees `CLAUDECODE=1` in its env, assumes it's about to cause an infinite loop, refuses to run.
- Server process exits silently (or throws an obscure message that doesn't mention `CLAUDECODE`).
- Your CLI hangs until `startupTimeout` (30s) then errors with "server did not start".

### Fix
Strip `CLAUDECODE` (and probably other `CLAUDE_*` / `CLAUDE_CODE_*` vars) before spawn. The craft-agents repo uses:

```ts
const { CLAUDECODE: _, ...parentEnv } = process.env;
const proc = Bun.spawn(['bun', 'run', serverEntry], {
  env: {
    ...parentEnv,
    CRAFT_SERVER_TOKEN: token,
    CRAFT_RPC_PORT: '0',
  },
  stdout: 'pipe', stderr: 'pipe',
});
```

### Why it's easy to miss
- `process.env` inheritance is invisible; the env vars that poison the child aren't in any config file you look at.
- The SDK's error message historically was "running inside Claude Code is not supported" which doesn't obviously mean "your env has CLAUDECODE set".
- Only happens in the narrow case where your tooling is invoked from Claude Code; standard shell use works fine.

### Generalization
When spawning a subprocess that uses a tool-agent SDK, audit which env vars that SDK treats as "I'm running inside myself" signals. Common suspects:
- `CLAUDECODE`
- `CLAUDE_CODE_OAUTH_TOKEN` (auth-credential leak in addition to nesting)
- `CLAUDE_CODE_SSE_PORT`
- `CODEX_SESSION_ID`

### Reference
`apps/cli/src/server-spawner.ts` — the craft-agents CLI spawn helper.
