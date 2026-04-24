---
name: claude-cli-grace-kill-after-success-result
description: When driving `claude -p --output-format stream-json`, treat a `result:success` event as completion even if the child doesn't self-exit; arm a 15s grace timer to kill, and return ok=true regardless of exit code.
category: integration
triggers:
  - claude -p stream-json
  - CLI hangs after result
  - spawn timeout after success
  - stream-json verbose
tags:
  - llm
  - claude-code
  - subprocess
version: 1.0.0
---

# claude-cli-grace-kill-after-success-result

`claude -p --output-format stream-json --verbose` sometimes emits the terminal `result` event but doesn't close its own stdout — the child stays resident until the outer timeout fires, which then reports a false failure even though work (drafts staged, $ billed) is complete.

## Pattern

Track `sawSuccessResult`. On the success event, arm a short grace timer that kills the child; on `close`, return success regardless of exit code if the flag is set.

```js
let sawSuccessResult = false, graceTimer = null;

function onAssistantEvent(evt) {
  if (evt.type === 'result' && evt.subtype === 'success') {
    sawSuccessResult = true;
    addUsage(evt.usage, evt.total_cost_usd);
    graceTimer ??= setTimeout(() => { try { child.kill(); } catch {} }, 15000);
  }
}

child.on('close', (code) => {
  clearTimeout(timer); clearTimeout(graceTimer);
  if (sawSuccessResult) return resolve({ ok: true, code, ... });
  // real failure path below
});
```

## Why 15 seconds

Empirically the CLI exits within ~2s most of the time; a generous 15s window covers the tail without dragging the loop. Any longer and you pay the opportunity cost; any shorter risks racing a clean exit.

## Symptom to recognize

Logs show `[import] done $N.NNNN` followed much later by `[import] timeout after 2400s`, with drafts already written on disk. That ordering is the signal — success arrived, only the process failed to hang up.
