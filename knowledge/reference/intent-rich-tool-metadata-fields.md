---
version: 0.1.0-draft
name: intent-rich-tool-metadata-fields
summary: The two hidden schema fields Craft Agents injects into every MCP tool — _intent (1-line why) and _displayName (UI override) — used for summarization context, UI rendering, and post-hoc debugging.
category: reference
tags: [mcp, metadata, intent, tool-schema]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/interceptor-common.ts
imported_at: 2026-04-18T00:00:00Z
---

# Tool metadata fields: _intent and _displayName

### Definitions
- `_intent`: a one-sentence (≤120 char) reason the agent is about to call this tool. Written by the LLM, read by downstream systems.
- `_displayName`: a human-friendly name for the tool invocation shown in UI — different from the mechanical tool name.

Both are injected as OPTIONAL schema fields into every MCP tool schema by the unified fetch interceptor (`packages/shared/src/unified-network-interceptor.ts`).

### Flow
1. Outgoing request interception walks `body.tools[].input_schema.properties` and adds `_intent` + `_displayName` fields (with description hints).
2. LLM fills them in as regular tool_use args.
3. Host code (session renderer, large-response summarizer, audit log) reads them off the `tool_use` event.
4. For Anthropic SSE, the interceptor STRIPS them from stream deltas before the SDK parses — Anthropic validates strictly.
5. For OpenAI SSE, passthrough; a downstream hook strips before actual execution.

### Consumers
- **Large-response summarization**: prompt includes `Tool intent: ${intent}` so Haiku summarizes ON-TARGET.
- **UI rendering**: display name beats mechanical tool name. "Fetching Gmail messages" reads better than `mcp__gmail__users_messages_list`.
- **Audit log / automations-history.jsonl**: intent recorded per call; "why did the agent do X 20 minutes ago" becomes answerable.
- **Permission UI**: "Ask to Edit" prompt can show the intent.

### Schema shape (injected by interceptor)
```json
{
  "_intent": {
    "type": "string",
    "description": "One short sentence explaining why you're calling this tool (max 120 chars). Goes to telemetry."
  },
  "_displayName": {
    "type": "string",
    "description": "Friendly name to display. E.g. 'Searching Gmail' rather than the tool ID."
  }
}
```

### Re-injection on follow-up
The interceptor keeps a `toolMetadataStore` keyed by `tool_use_id`. When the next turn's request includes past tool calls in `messages[].content`, the interceptor re-injects the stored metadata values so the model sees consistency.

### Performance / token cost
- Tiny — typically 10-30 tokens per tool invocation.
- Net saving: better summarization means fewer rerolls / clarifications.

### Reference
- Constants + zod schemas: `packages/shared/src/interceptor-common.ts` (`intentSchema`, `displayNameSchema`, `toolMetadataStore`).
- Injection: `unified-network-interceptor.ts`.
- Consumption: `large-response.ts` builds summarization prompt with `_intent`.
