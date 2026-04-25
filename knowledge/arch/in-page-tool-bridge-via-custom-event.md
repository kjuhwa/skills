---
version: 0.1.0-draft
name: in-page-tool-bridge-via-custom-event
summary: Web pages can expose their own tools to the automation agent by listening for a `devtoolstooldiscovery` CustomEvent and calling `event.respondWith(toolGroup)`; the MCP server discovers them via CDP `DOMDebugger.getEventListeners` and bridges each to MCP tools.
category: arch
confidence: medium
tags: [in-page-tools, custom-event, cdp, tool-discovery, webmcp]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/McpResponse.ts
imported_at: 2026-04-18T00:00:00Z
---

# In-Page Tool Bridge Architecture

## Context

A generic browser automation agent has to rediscover UI affordances for every page — "where's the search box?", "does this site have a 'like' button?". Asking the agent to re-derive this from the a11y tree every call is expensive. Letting each app expose its own named tools is a design improvement, but requires a protocol the page can opt into without server-side changes.

## The fact / decision / pitfall

Protocol: the page attaches a listener to the custom event `devtoolstooldiscovery` on `window`. The listener receives an event with a `respondWith` callback and synchronously calls it with:

```ts
type ToolGroup = {
  name: string;
  description: string;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema7;
    execute: (args: Record<string, unknown>) => unknown;
  }>;
};
```

On the MCP server side:
1. Before tool calls, check if the page has a `devtoolstooldiscovery` listener via CDP `DOMDebugger.getEventListeners` on the window.
2. If yes, dispatch the event via `page.evaluate` and capture the toolGroup in `window.__dtmcp.toolGroup`.
3. Also install `window.__dtmcp.executeTool = async (name, args) => toolGroup.tools.find(t => t.name === name).execute(args)` so any `evaluate`-based caller can use them.
4. Expose two MCP tools: `list_in_page_tools` and `execute_in_page_tool({toolName, params})`.
5. For `execute_in_page_tool`: validate params with Ajv against the schema, resolve any `HTMLElement` placeholder (`{uid:string}`) to an `ElementHandle` server-side, then evaluate in the page passing the handles as *non-nested* args so Puppeteer marshals them into real DOM elements.

## Evidence

- `src/McpResponse.ts::getToolGroup` — the discovery probe and event dispatch.
- `src/tools/inPage.ts` — the `list_in_page_tools` and `execute_in_page_tool` MCP tools and the Ajv-validated executor.
- `docs/tool-reference.md` — in-page category.

## Implications

- Pages can opt in without server-side coordination — a powerful extension point for framework authors.
- The page's tool descriptions are attacker-controlled content. If the agent processes them as instructions, a hostile page can inject tools that look benign. Sandbox semantically.
- `HTMLElement` type schema is rewritten server-side to `{uid:string}` before the agent sees it — the agent passes uids, the server resolves to handles. See the a11y-snapshot-with-uids pattern.
- The alternative WebMCP standard is an evolution of this idea; this project tracks both under `experimentalWebmcp`.
- The same `window.__dtmcp.executeTool` handle is useful for tests and REPL — not just MCP.
