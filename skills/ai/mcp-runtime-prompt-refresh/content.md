# MCP runtime prompt refresh

## Problem
MCP prompts are served via `prompts/list` and `prompts/get`. Out of the box most servers bake prompts in at startup — improving a prompt means editing code, restarting the server, and reconnecting every client. For an MCP server that wraps a dynamic domain (changing API catalog, user-authored playbooks) you want the LLM itself to refine prompts as it learns the tool surface and persist that refinement across restarts.

## Pattern
Ship a built-in MCP tool (`refresh_prompts`) whose input is an array of `PromptDef`-shaped objects. On call:

1. Validate and coerce the payload into in-memory `PromptDef`s.
2. Replace the server's prompt list under a lock (`synchronized` on the server instance).
3. Persist to a JSON file (`data/prompts.json`) — on next startup, load this file before the in-code defaults so the refinement survives restarts.
4. Send `notifications/prompts/list_changed` over the same JSON-RPC transport so connected clients refetch without needing a reconnect.
5. Return `{ status: 200, "200": { ack: true } }` — a shape that survives the generic `Map → tool_result` wrapping in most MCP servers.

```java
synchronized void replacePrompts(List<PromptDef> next) {
  this.prompts.clear();
  this.prompts.addAll(next);
}
// …after refresh_prompts executes:
JsonStore.replacePrompts(normalizedCopy);
mcp.sendNotification("notifications/prompts/list_changed", Map.of());
```

Bootstrap with a single self-referential prompt (e.g. `tool_driven_generation`) that instructs the model to call `tools/list`, design per-tool prompts, and finally call `refresh_prompts` with the result. This lets a fresh install improve itself after one round-trip.

## When to use
- MCP server with prompts that should evolve (API-driven, user-authored, LLM-authored).
- Multi-spec servers where the prompt surface depends on which specs got loaded this run.
- You want a feedback loop where the LLM refines its own operator prompts.

## Pitfalls
- **Normalize `arguments` to an array**: clients reject `prompts/list` if any prompt has `arguments: null`. Force-convert to `[]` both in memory and on disk.
- **Hold the same list reference**: `replacePrompts` must `clear+addAll`, not reassign. Anything holding the old reference (Swagger UI, debug handlers) otherwise serves stale prompts.
- **Persist only after in-memory success**: write to disk only after replacement succeeds — otherwise a malformed payload can brick startup.
- **Notify both transports**: if you run stdio-MCP and an HTTP-adjacent server (Swagger UI) in the same process, call `sendNotification` on each.
- **Guard against unbounded growth**: the built-in tool is a write API. Cap payload size and validate names (`[a-z0-9_]+`, <128 chars).
- **Emit, don't echo**: do not include the full new prompt list in the `notifications/prompts/list_changed` params — clients must refetch via `prompts/list`.
