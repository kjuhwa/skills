---
version: 0.1.0-draft
name: built-in-session-tools-parity
summary: Session-scoped tools (SubmitPlan, config_validate) live in session-tools-core and are wired identically into Claude and Pi backends via separate stdio MCP servers — parity tested by claude/session-tool-parity.test.ts and pi/session-tool-parity.test.ts.
category: architecture
tags: [session-tools, mcp, parity, multi-backend]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/session-tools-core/src
imported_at: 2026-04-18T00:00:00Z
---

# Session-scoped tool parity across backends

### Context
Claude Agent SDK natively supports registering per-session SDK tools (see `createSdkMcpServer` in `@anthropic-ai/claude-agent-sdk`). Pi SDK doesn't have the same concept. To achieve feature parity — same session tools available regardless of LLM backend — Craft Agents uses an intermediate:

`packages/session-tools-core` = the HANDLERS and the SCHEMAS for session-scoped tools, kept backend-agnostic.

Two thin wrappers consume it:
- Claude: `session-scoped-tools.ts` calls `createSdkMcpServer()` with handlers from `session-tools-core`.
- Pi: `packages/session-mcp-server` is a standalone CJS stdio MCP server that's spawned per Codex session; it also imports handlers from `session-tools-core`.

### Why not just use the MCP route for both?
Claude Agent SDK's in-process `createSdkMcpServer` is more efficient for Claude sessions — no stdio subprocess overhead. Pi-managed Codex sessions REQUIRE stdio MCP. Keeping the handler logic shared avoids "implement twice, test twice".

### Parity testing
Both `packages/shared/src/agent/backend/claude/session-tool-parity.test.ts` and `packages/shared/src/agent/backend/pi/session-tool-parity.test.ts` exist. They exercise the same list of scenarios against each backend's session-tool wiring. If a new tool is added, BOTH tests must be updated. Accepted cost of the dual-wire design.

### Tool types
- `SubmitPlan`: the agent writes a plan file to `<session>/plans/`, UI displays; user approves/rejects.
- `config_validate`: validates source config JSON before apply.
- (others in `session-tools-core/src/tool-defs.ts`)

### Callback channel
For tools that need host interaction (pause for user approval, auth request), the stdio MCP server writes `__CALLBACK__<json>` lines to stderr that the host parses. The Claude in-process SDK path doesn't need this — it can await host callbacks via promises directly.

### Session context injection
Every session-tool handler receives a `SessionToolContext`:
```ts
{ sessionId, workspaceRootPath, plansFolderPath, callbackPort? }
```
Same struct in both wire paths. Handlers are pure-ish; they write to disk (`plans/...`) or send callback messages but don't close over any backend-specific state.

### Reference
- `packages/session-tools-core/src/handlers/` (shared logic)
- `packages/shared/src/agent/session-scoped-tools.ts` (Claude wiring)
- `packages/session-mcp-server/src/index.ts` (Pi / stdio wiring)
- `*-session-tool-parity.test.ts` in both backend dirs.
