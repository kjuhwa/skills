---
name: mcp-tool-intent-metadata-injection
description: Inject a hidden _intent / _displayName field into every MCP tool schema via a fetch interceptor so large-response summarization and UI rendering have context that the LLM never sees.
category: mcp-integration
version: 1.0.0
version_origin: extracted
tags: [mcp, interceptor, metadata, summarization]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/unified-network-interceptor.ts
imported_at: 2026-04-18T00:00:00Z
---

# MCP tool intent-metadata injection via fetch interceptor

## When to use
- Large MCP tool responses (60KB+) need automatic summarization, but summarization needs to know *why* the user called the tool.
- You have an LLM SDK that owns the fetch loop and you can't modify how tools are defined.
- Different UI surfaces want different display names for the same underlying tool.

## How it works
1. Build a shared fetch interceptor as a standalone CJS bundle (e.g. via esbuild) - `interceptor.cjs`.
2. Inject it into every Node-based SDK subprocess with `--require=/path/to/interceptor.cjs` (or `--preload` under Bun). This patches `globalThis.fetch` BEFORE any SDK captures it.
3. On outgoing LLM requests, walk the `tools[]` array in the JSON body. For every tool, add two hidden schema fields:
   - `_intent`: one-liner on why the assistant is calling it.
   - `_displayName`: override for UI rendering.
4. The LLM fills them in as normal schema fields. Your host code reads them off the `tool_use` event.
5. On SSE response streaming, strip these fields back out before handing to the SDK - the SDK will reject unknown fields on Anthropic. For OpenAI, pass them through and let a downstream hook strip later (the two providers differ on strictness).
6. Store per-call metadata in a `toolMetadataStore` keyed by tool-use ID; re-inject on the next request so the model still sees the history it wrote.

## Example
```ts
// interceptor.cjs (preloaded into every SDK subprocess)
const origFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (init?.body && isClaudeMessagesRequest(input)) {
    const body = JSON.parse(init.body);
    for (const t of body.tools ?? []) {
      t.input_schema.properties._intent = { type: 'string', description: '1-line why' };
      t.input_schema.properties._displayName = { type: 'string' };
    }
    init = { ...init, body: JSON.stringify(body) };
  }
  const res = await origFetch(input, init);
  return interceptSse(res, /* strip metadata for Anthropic */);
};
```

## Gotchas
- Bundle as CJS with bundled deps - you're `--require`-ing into arbitrary Node processes that don't have your `node_modules`.
- Anthropic's SSE validation is strict; you MUST strip metadata from streamed deltas before the SDK parses them.
- Re-injection on follow-up turns is easy to forget. Store metadata by the tool-use-id and walk the `messages[].content` array to rewrite.
- The LLM will "waste" tokens writing `_intent` values - cap the description with a firm instruction like "one short sentence, <120 chars".
