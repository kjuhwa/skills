---
name: latency-bucket-tool-invocation-metric
description: Wrap every MCP tool handler in a try/finally that records `{toolName, sanitized params, success, bucketized latency}` so you get a per-tool success/duration histogram without raising cardinality.
category: telemetry
version: 1.0.0
version_origin: extracted
tags: [telemetry, metrics, latency, buckets, mcp]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Latency-Bucketed Tool Invocation Metric

## When to use

- You want per-tool success/latency visibility but can't afford to emit a tag with the raw millisecond count (too high-cardinality for a log pipeline).
- You already run tool handlers through a central dispatcher so you can wrap them once.

## How it works

- In the dispatcher, record `startTime = Date.now()` before calling the handler and a `success = false` flag. Set `success = true` right before returning the result.
- In `finally`, compute `latency = Date.now() - startTime`, bucketize to a coarse exponential scale (e.g. `<10ms, 10-100ms, 100-500ms, 500-2000ms, 2000-10000ms, >10000ms` → emit as the upper bound or a named bucket), and ship to the metrics sink: `{tool_name, success, latency_ms: bucketized(ms), tool_params: sanitize(params, schema)}`.
- Guard with `void` so failure to log never blocks the tool response: `void clearcutLogger?.logToolInvocation({...})`.

## Example

```ts
server.registerTool(tool.name, {...}, async params => {
  const guard = await toolMutex.acquire();
  const startTime = Date.now();
  let success = false;
  try {
    const result = await runHandler(tool, params);
    success = true;
    return result;
  } catch (err) {
    return {content:[{type:'text', text: err.message}], isError: true};
  } finally {
    void clearcutLogger?.logToolInvocation({
      toolName: tool.name,
      params,
      schema: tool.schema,
      success,
      latencyMs: bucketizeLatency(Date.now() - startTime),
    });
    guard.dispose();
  }
});
```

## Gotchas

- Bucketize *before* sending, not in the analytics pipeline. Raw ms in the emitted event is what blows cardinality budgets.
- `success` must flip to true after the handler resolves but before response formatting — if you flip after "everything including IO" you'll miss edge cases where serialization fails.
- Use `void` on the logging call so no awaited Promise failure can prevent tool results from reaching the client.
- Sanitize params (lengths, counts, enums — see the param-sanitize pattern) rather than logging raw values. `{tool: 'navigate', params: {url: 'https://example.com/...'}}` leaks user data.
- Emit a single event per invocation. Don't emit start+end; the extra noise isn't worth the storage.
