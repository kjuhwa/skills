---
name: stream-json-assistant-event-router
description: Consume `claude -p --output-format stream-json --verbose` line-by-line from a child process and route each event type (assistant text, tool_use, result) to the parent's structured logger so a dashboard can render a live feed without waiting for the child to finish.
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [claude-code, stream-json, observability, logging, sse, dashboard, child-process]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
---

# Stream-JSON Assistant Event Router

## When to use

You are spawning `claude -p` as a child process and need the parent to show **live** progress — current tool call, latest assistant message, final cost — instead of staring at a spinner until the run finishes. `--output-format stream-json` emits one JSON object per line, perfect for a line-delimited router.

## Event types you'll see (the only ones that matter)

| `evt.type` | When | What to pull |
|---|---|---|
| `system` (subtype `init`) | Run starts | Ignore or log once (model id, available tools) |
| `assistant` | Every model turn | `evt.message.content[]` — each block is `{type:'text', text}` or `{type:'tool_use', name, input}` |
| `user` | Tool result going back to the model | Usually noise; drop unless debugging |
| `result` | Run ends | `subtype` = `success` / `error_max_turns` / `error_during_execution`; `total_cost_usd`, `duration_ms`, `num_turns` |

Everything else (thinking blocks, server tool events, cache markers) can be safely ignored by a dashboard.

## Reference router

```js
function handleStreamLine(raw, log) {
  const line = raw.trim();
  if (!line) return;
  let evt;
  try { evt = JSON.parse(line); }
  catch { if (line.length < 250) log('info', line); return; }  // non-JSON fallback

  if (evt.type === 'assistant' && evt.message?.content) {
    for (const blk of evt.message.content) {
      if (blk.type === 'text' && blk.text) {
        const snippet = blk.text.split('\n').slice(0, 3).join(' ').slice(0, 200);
        log('info', snippet);
      } else if (blk.type === 'tool_use') {
        log('info', `→ tool: ${blk.name}`);
      }
    }
  } else if (evt.type === 'result') {
    if (evt.subtype === 'success') {
      const cost = evt.total_cost_usd ? `$${evt.total_cost_usd.toFixed(4)}` : '';
      log('success', `done ${cost}`);
    } else {
      log('warn', `result: ${evt.subtype || '?'}`);
    }
  }
}

// feed child.stdout into it line-by-line
child.stdout.on('data', (d) => {
  for (const ln of d.toString().split('\n')) handleStreamLine(ln, log);
});
```

## Rules

- **Split on `\n`, not on boundaries of a `data` chunk.** `stdout.on('data')` gives you arbitrary chunk boundaries. One chunk can contain 3.5 lines; the next resumes the half-line. Either buffer until `\n` or accept that the last partial line of each chunk may JSON.parse-fail and fall through to the non-JSON branch (fine for logs, not for an exactly-once pipeline).
- **Clip assistant text to a snippet.** The full assistant message can be multiple KB. A dashboard only wants the first 2–3 lines, ≤200 chars. Save the full transcript separately if you need it.
- **Route `tool_use` by name, not by input.** `input` is the full tool-call JSON — do not render it in a live dashboard (it contains prompts, diffs, sometimes secrets). Just log the tool name: `→ tool: Edit` is enough for status.
- **Always handle the `result` event.** That's your signal to clear the spinner, record duration, and capture `total_cost_usd` for billing. If you miss it because of a split chunk, your dashboard will show "running" forever after the child has actually exited.
- **Fall through to a plain-text logger for non-JSON lines.** Early in the run you get banner lines, deprecation notices, occasional stderr bleed. Clip them to ≤250 chars and log as `info` so they're visible but don't flood.
- **Do not try to deliver a transcript.** `stream-json` is an event feed, not a transcript reconstruction format. If you need the final transcript, run the same prompt with `--output-format json` to a file once at the end.

## Counter / Caveats

- **Schema is not frozen.** Claude CLI has historically added fields and subtypes. Route by **known** types/subtypes only; ignore unknowns silently rather than crashing.
- **`total_cost_usd` can be `0` or undefined** on plans that don't report pricing. Guard with `evt.total_cost_usd ? ... : ''`.
- **Long `text` blocks can span multiple `assistant` events** when the model streams. You'll see several incremental `assistant` events for one logical message. For a live-ticker dashboard, that's fine (each snippet logs as its own line). For transcript reconstruction, you'd need to concatenate by `message.id`.
- **`tool_use.input` may be large enough to cross chunk boundaries.** If you want to parse inputs (not render them), wait until `\n` before JSON.parse.

## Related

- Skill: `claude-cli-unattended-wrapper` — the spawner that produces this stream.
- Knowledge: `claude-cli-hook-bypass-envs` — keep the parent's harness out of the child's stdout.
