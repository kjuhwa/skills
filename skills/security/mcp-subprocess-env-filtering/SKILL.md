---
name: mcp-subprocess-env-filtering
description: When spawning a stdio MCP server (or any untrusted subprocess), allowlist/denylist environment variables so app-level auth tokens and third-party API keys don't leak into the child process.
category: security
version: 1.0.0
version_origin: extracted
tags: [mcp, subprocess, env-vars, credential-leakage]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/mcp/client.ts
imported_at: 2026-04-18T00:00:00Z
---

# Filter env vars to MCP subprocesses

## When to use
- Spawning a stdio MCP server / any third-party subprocess.
- Host process holds credentials the subprocess does not need (ANTHROPIC_API_KEY, GITHUB_TOKEN, AWS_*).
- Users add arbitrary MCP servers - you can't audit every `npx some-random-mcp`.

## How it works
1. Maintain a `BLOCKED_ENV_VARS` denylist of well-known secret names:
   - App auth: `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`
   - Cloud: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
   - Common tokens: `GITHUB_TOKEN`, `GH_TOKEN`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `STRIPE_SECRET_KEY`, `NPM_TOKEN`.
2. When building the subprocess env, start from `process.env`, drop every key in the denylist.
3. Allow the MCP source config to explicitly opt back in via a per-server `env: { FOO: '...' }` field — the source owner has to know what they're passing.
4. Mirror the list in any secondary spawn site (e.g. `session-tools-core`'s `transform_data`) - the repo calls this out in a comment so the two lists don't drift.

## Example
```ts
const BLOCKED_ENV_VARS = [
  'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN', 'GH_TOKEN', 'OPENAI_API_KEY', 'GOOGLE_API_KEY',
  'STRIPE_SECRET_KEY', 'NPM_TOKEN',
];
const childEnv = { ...process.env, ...sourceConfig.env };
for (const k of BLOCKED_ENV_VARS) delete childEnv[k];
spawn(cmd, args, { env: childEnv });
```

## Gotchas
- A denylist is inherently incomplete - prefer an allowlist for truly untrusted processes.
- Don't forget to scrub from the user's shell env (`.zshrc` exports) too - loading their shell env into your app first (see `shell-env.ts` in craft-agents) can pull in MORE secrets.
- Document the list in one canonical place and reference it from every spawn site; drift is the #1 failure mode.
- The README of the project lists these publicly - treating the list as "security through documentation" is fine because the real control is the code filter, not the secret of the list.
