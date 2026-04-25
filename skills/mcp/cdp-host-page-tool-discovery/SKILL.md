---
name: cdp-host-page-tool-discovery
description: Let a web page expose its own MCP-like tools to the automation agent via a custom `devtoolstooldiscovery` event and CDP listener introspection, then bridge them as MCP tools at runtime.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, cdp, in-page-tools, event-bridge, ajv]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/inPage.ts
imported_at: 2026-04-18T00:00:00Z
---

# In-Page Tool Discovery via Custom Event

## When to use

- You're building a general-purpose browser automation MCP and want individual pages/apps to self-describe what the agent can do ("fill this form", "run this search").
- Page-specific tools change constantly; you don't want to hard-code them in the MCP server.
- You want to bridge arbitrary JSON-schema tools from page context into the MCP tool surface without reloading the server.

## How it works

- Inside the MCP server, before running any tool, probe the page: call `DOMDebugger.getEventListeners` on the window object via CDP. If there's a listener for `devtoolstooldiscovery`, the page is participating.
- Dispatch a `CustomEvent('devtoolstooldiscovery')` with a `respondWith` callback attached. The page listener calls `respondWith({name, description, tools: [{name, description, inputSchema, execute}]})`. Store it on `window.__dtmcp.toolGroup` so subsequent calls can find it.
- Expose two MCP tools: `list_in_page_tools` (which just flips a builder flag and the response class serializes `toolGroup`) and `execute_in_page_tool({toolName, params})`.
- When executing: validate `params` with Ajv against the page-provided `inputSchema`. For params shaped as `{uid: string}` (HTMLElement markers), resolve the uid server-side via `page.getElementByUid(uid)` into an `ElementHandle`, then pass as *non-nested* arguments to `page.evaluate` so Puppeteer auto-marshals them into real DOM elements in the page context.
- Inside the page, `window.__dtmcp.executeTool(toolName, args)` looks up the tool and invokes its `execute(args)`.

## Example

```ts
// probe: does the page participate?
const {listeners} = await client.send('DOMDebugger.getEventListeners', {objectId: windowObjectId});
if (!listeners.find(l => l.type === 'devtoolstooldiscovery')) return undefined;

// dispatch discovery event
const toolGroup = await page.evaluate(() => new Promise(resolve => {
  const ev = new CustomEvent('devtoolstooldiscovery');
  (ev as any).respondWith = tg => {
    window.__dtmcp = window.__dtmcp || {};
    window.__dtmcp.toolGroup = tg;
    window.__dtmcp.executeTool ??= async (name, args) =>
      await tg.tools.find(t => t.name === name)!.execute(args);
    resolve(tg);
  };
  window.dispatchEvent(ev);
  setTimeout(() => resolve(undefined), 0); // no listener responded synchronously
}));

// execute from MCP
const handles = await resolveUids(params, page); // uid:{uid} => ElementHandle
await page.evaluate(async (name, args, ...els) => {
  for (const [k, v] of Object.entries(args)) {
    if (v && typeof v === 'object' && 'uid' in v) args[k] = els.shift();
  }
  return window.__dtmcp.executeTool(name, args);
}, toolName, params, ...handles);
```

## Gotchas

- Responding synchronously in the same tick is important; the probe uses `setTimeout(..., 0)` to resolve as "no listener" if the page doesn't answer. Pages that answer from `await fetch(...)` first will be missed.
- HTMLElement marshaling only works when ElementHandles are spread as *top-level* `evaluate` arguments, not nested in an object. The pattern above replaces `{uid}` placeholders in the page-side code.
- Validate with Ajv server-side before `evaluate`. Otherwise malformed params blow up in page context with confusing stack traces.
- JSON-schema `x-mcp-type: "HTMLElement"` nodes should be rewritten server-side to `{type:"object", properties:{uid:{type:"string"}}, required:["uid"]}` so the agent sees a shape it knows how to fill.
- The page's tool descriptions are attacker-controlled. If an untrusted page can expose tools to the agent, treat the tool list as data, not instructions.
