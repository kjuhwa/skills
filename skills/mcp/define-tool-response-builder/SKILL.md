---
name: define-tool-response-builder
description: Use a structured Response builder object for MCP tool handlers instead of letting each handler produce its own text, so cross-cutting concerns like pagination, snapshots, and images compose cleanly.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, tool-design, response-builder, structured-content, composition]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/McpResponse.ts
imported_at: 2026-04-18T00:00:00Z
---

# Response Builder Pattern for MCP Tool Handlers

## When to use

- You are building an MCP server with many tools that need to return a mix of text, images, structured JSON, and attached resources.
- Individual tool handlers start duplicating code for "also attach a snapshot", "also paginate this list", "redact these headers".
- You want both a human-readable Markdown response and a parallel `structuredContent` JSON payload without each tool handling both by hand.

## How it works

- Define a `Response` interface whose methods are intent verbs like `appendResponseLine`, `includeSnapshot`, `setIncludeNetworkRequests(value, options)`, `attachImage`, `attachTraceSummary`. Tool handlers never build the final payload themselves; they only flip flags on the builder.
- Pass an instance of the builder into each handler along with the request and a `Context`. The handler mutates the builder, returns void, and the framework calls `response.handle(toolName, context)` afterwards.
- Inside `handle`, the builder walks its accumulated state and calls formatters (`SnapshotFormatter`, `NetworkFormatter`, etc.) to produce the final `{ content, structuredContent }` pair.
- Keep the builder dumb about business logic: it only knows how to compose, paginate, and format. Fetching data (snapshots, network requests) is delegated to `Context` methods.
- Gate optional sections (`experimentalStructuredContent`, `redactNetworkHeaders`, category filters) on flags passed in at construction, so one builder code-path serves every runtime configuration.

## Example

```ts
// Handler stays tiny: declare intent, don't format.
export const listNetworkRequests = definePageTool({
  name: 'list_network_requests',
  schema: { pageSize: zod.number().int().positive().optional() },
  handler: async (request, response, context) => {
    response.setIncludeNetworkRequests(true, {
      pageSize: request.params.pageSize,
      pageIdx: request.params.pageIdx,
    });
  },
});

// Builder does the cross-cutting work once, for every tool:
class McpResponse {
  async handle(toolName, context) {
    if (this.#networkRequestsOptions?.include) {
      const requests = context.getNetworkRequests(this.#page);
      const paginated = paginate(requests, this.#networkRequestsOptions.pagination);
      // push to both text lines and structuredContent
    }
    // ...same pattern for snapshots, console, trace summary, lighthouse, images
    return { content: [textContent, ...imageContents], structuredContent };
  }
}
```

## Gotchas

- The builder must throw or degrade gracefully when a section needs a page but `setPage()` wasn't called — otherwise tools silently return half a result.
- Keep the `structuredContent` shape mirrored with the text: if you add a new text section, add the corresponding JSON key or downstream programmatic consumers will miss it.
- Watch for ordering bugs when mixing `appendResponseLine` with later section appends — set a single fixed serialization order in `handle()` rather than depending on call order.
- Redaction/privacy flags (like `redactNetworkHeaders`) must be threaded through the builder to every formatter that touches raw data; don't let handlers bypass the builder and call the formatter directly.
