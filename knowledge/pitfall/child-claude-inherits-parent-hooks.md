---
version: 0.1.0-draft
name: child-claude-inherits-parent-hooks
description: When spawning Claude CLI from a Node process, the child inherits OMC/session hooks that can hijack the output into side-channels — you only see a confirmation string
category: pitfall
tags:
  - claude-cli
  - subprocess
  - hooks
  - orchestration
---

# Child Claude Inherits Parent Hooks — Output Gets Hijacked

## The symptom

You spawn `claude -p` from a Node orchestrator with a clear prompt asking for structured output blocks (`===APP===`, etc.). The child process returns `code 0` with a response like:

> `Autopilot state set to active: false. The three creative apps (app-a, app-b, app-c) were delivered above.`

No structured blocks. The "delivered above" is a lie — the child Claude genuinely produced the content, but some hook intercepted it and routed it through a side channel (tool calls, file writes, session state) that your `claude -p` invocation can't observe.

## Why it happens

`claude` inherits environment and config from the shell that spawned it. If the parent shell has OMC (oh-my-claudecode) or similar hooks active — `SessionStart`, autopilot hooks, `UserPromptSubmit` handlers — they run inside the child too. Any of them can:

- Rewrite the prompt before Claude sees it
- Detect "autopilot loop" keywords and enter a different execution mode
- Write output to session state instead of stdout
- Complete silently with a bland confirmation message

## Fix: env-var isolation

Spawn the child with hooks explicitly disabled:

```js
const child = spawn(cmd, [], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DISABLE_OMC: '1',
    OMC_SKIP_HOOKS: '*',
    CLAUDE_DISABLE_SESSION_HOOKS: '1',
  },
});
```

This ensures the child Claude sees only the prompt you sent, produces inline text output, and doesn't try to be "clever" about routing the response.

## Why not just `--bare`?

`claude --bare` is tempting — it skips hooks, plugins, auto-memory, keychain reads. But it also disables OAuth/keychain authentication. If the user is logged in via OAuth (no `ANTHROPIC_API_KEY` env var set), `--bare` fails with `Not logged in`. Env-var hook suppression keeps auth working while still stopping hooks.

## Why not reinforce via prompt?

You might try: *"Do not use tools. Do not summarize. Output blocks inline."* This helps but is unreliable — if a `UserPromptSubmit` hook has already rewritten your prompt before Claude sees it, your instructions never reach the model. Env isolation is the actual fix; prompt guardrails are belt-and-suspenders.

## How to detect this happened

Your response is surprisingly short (few hundred bytes) and contains meta-phrases like:
- "was delivered above"
- "Autopilot state"
- "completed successfully"
- "Files written to ..."

None of those belong in a raw text-generation response. When you see them, check for parent-process hooks first, before blaming the prompt or the model.

## Related

- Keep a debug dump of Claude's raw output whenever parsing fails (`fs.writeFileSync(dumpFile, response)`) — the only way to diagnose these issues is to see what actually came back.
- Document env vars your orchestrator sets at the top of the server file so future maintainers don't `unset` them thinking they're stale config.
