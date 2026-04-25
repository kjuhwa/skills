---
name: feature-flag-gated-tool-registration
description: Gate MCP tool registration on CLI/category/experimental flags so one code base serves many tool-surface configurations (slim vs full, experimental on/off, category-disabled) without branching inside handlers.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, feature-flags, tool-registration, configuration]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Feature-Flag-Gated Tool Registration

## When to use

- Your MCP server has optional categories (performance, network, emulation, extensions) the user can disable to shrink the surface.
- You have experimental tools you don't want exposed by default.
- Tool-level metadata should decide visibility, not per-tool `if (flag) { ... }` branches.

## How it works

- Each tool declares category and conditions in its `annotations`: `{category: ToolCategory.PERFORMANCE, readOnlyHint: true, conditions: ['experimentalVision']}`.
- Central `registerTool(tool)` consults parsed args and skips registration for tools whose category is disabled (`--no-category-performance`), whose condition list mentions a flag that's off, or whose `readOnlyHint === false` when the client only requests read-only tools.
- Add schema modifications per-flag in the same place: e.g. `experimentalPageIdRouting` injects a `pageId` param into page-scoped tool schemas *only when on*.
- The tool itself stays pure: no flag checks inside handlers. That makes individual tool code portable and testable.

## Example

```ts
function registerTool(tool) {
  if (tool.annotations.category === ToolCategory.EMULATION && !serverArgs.categoryEmulation) return;
  if (tool.annotations.category === ToolCategory.PERFORMANCE && !serverArgs.categoryPerformance) return;
  if (tool.annotations.conditions?.includes('computerVision') && !serverArgs.experimentalVision) return;
  if (tool.annotations.conditions?.includes('experimentalWebmcp') && !serverArgs.experimentalWebmcp) return;

  const schema = ('pageScoped' in tool && tool.pageScoped && serverArgs.experimentalPageIdRouting && !serverArgs.slim)
    ? {...tool.schema, ...pageIdSchema}
    : tool.schema;

  server.registerTool(tool.name, {description: tool.description, inputSchema: schema, annotations: tool.annotations}, handler);
}

for (const tool of createTools(serverArgs)) registerTool(tool);
```

## Gotchas

- Category flags should be positive *by default* but overridable to false via `--no-category-X`. The reverse (opt-in) gives a useless empty surface on first run.
- `conditions` is an array: a tool can require `['experimentalVision', 'experimentalMemory']`. Decide AND vs OR semantics and stick with it (AND is safer — everything must be enabled).
- When a tool is gated off, consider emitting a one-line server startup log so users debugging "why is tool X missing?" find the flag.
- Don't let gating vary mid-session. Flags are read at startup; changing them requires restart. Log the effective flag set prominently.
- Doc generation should enumerate only unconditional tools by default, with a separate "experimental" section — otherwise docs show tools users can't actually call.
