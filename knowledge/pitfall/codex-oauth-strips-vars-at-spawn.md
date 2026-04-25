---
version: 0.1.0-draft
name: codex-oauth-strips-vars-at-spawn
summary: Codex (ChatGPT Plus OAuth via Pi SDK) looks at specific env vars at subprocess spawn; leaving CODEX_SESSION_ID / OPENAI_API_KEY from an earlier run can misroute the current session to the wrong account.
category: pitfall
tags: [codex, oauth, env-pollution, pi-sdk]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/pi-agent-server/src
imported_at: 2026-04-18T00:00:00Z
---

# Codex OAuth env pollution pitfall

### The issue
The Pi SDK path for Codex (ChatGPT Plus OAuth) spawns a subprocess that reads auth config from env. Common pollution sources:
- `OPENAI_API_KEY` in the user's shell → wrong account used if they've also connected Codex OAuth.
- `CODEX_SESSION_ID` from an aborted earlier run → Codex attaches to a stale session.
- `CODEX_BINARY` / `CODEX_HOME` pointing at a non-bundled install → skips the shipped Codex.

### Defensive spawn env
When spawning the Pi agent server subprocess, DO NOT blindly inherit env. Build a minimal allowlist:

```ts
const subprocessEnv = {
  HOME: process.env.HOME,
  USER: process.env.USER,
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  // explicit: auth vars we CONTROL, not inherited
  PI_CONFIG_DIR: getPiConfigDir(workspaceId),
  CODEX_SESSION_ID: newSessionId,
};
```

Strip known pollutants: `OPENAI_API_KEY`, `CODEX_BINARY`, `CODEX_HOME`, `CODEX_SESSION_ID`, `COPILOT_TOKEN`, `GITHUB_COPILOT_*`.

Also strip `CLAUDECODE` (see related pitfall) even if going the Pi path — the CLI's nesting guard doesn't care which SDK the child uses.

### Auto-resolve bundled binary
Rather than trust `PATH`, have a `binary-resolver` module check, in order:
1. Explicit `CODEX_PATH` env.
2. Bundled binary (`vendor/codex/<platform-arch>/codex`).
3. Local dev fork.
4. System PATH as last resort.

Set it yourself before spawn so the child doesn't pick up a random system version:
```ts
subprocessEnv.CODEX_PATH = resolveCodexBinary();
```

### Symptoms if you miss it
- User has ChatGPT Plus, connects it in the app, expects Codex to use their subscription.
- Subprocess starts, finds `OPENAI_API_KEY` in env (user had set for another project).
- Codex uses the API key, bills the user instead of using their subscription.
- User is (rightly) angry.

### Reference
- `packages/pi-agent-server/src/index.ts` and `custom-endpoint-models.ts`.
- `apps/electron/src/main/index.ts` comments on `CODEX_PATH` binary-resolver strategy.
