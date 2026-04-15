---
name: async-subagent-resume-on-missing-artifact
description: When an async subagent is reported "completed" but its final message hints at unfinished work (e.g., "Now let me build…"), verify the expected on-disk artifact before moving on; if missing, use SendMessage to the agent id to finalize rather than re-dispatching a fresh agent.
category: workflow
tags: [agents, async, verification, send-message]
triggers:
  - "agent completed but artifact missing"
  - "subagent incomplete output"
scope: user
version: 1.0.0
---

# Resume an async subagent instead of re-dispatching

Async subagents can be marked "completed" even when their final user-facing message is a mid-thought like "I have all the data needed. Now let me build…". Their in-memory plan may have not resulted in an actual file write. Re-dispatching a brand new agent loses all the setup context.

## Protocol

1. **Always verify artifact on disk** after an async agent reports completion and you expect a file:
   ```bash
   ls -la docs/expected-artifact.json
   ```

2. If missing and the result message looks truncated / mid-action:
   - Do NOT spawn a fresh agent.
   - Call `SendMessage` to the agent's id with a pointed follow-up:
     ```
     SendMessage({
       to: "<agentId>",
       message: "The file `docs/x.json` was not actually written. Please use the Write tool to save the complete output you built. Report back with the final summary."
     })
     ```
   - The runtime will resume the agent from its transcript — all prior analysis is preserved.

3. Wait for the completion notification; verify artifact appears on disk.

## When to give up and re-dispatch

- Two SendMessage rounds without the file appearing.
- Agent responds that the data it built is no longer in context.
- In those cases, dispatch a fresh agent with a simpler, more explicit "write the file first, summarize after" prompt.
