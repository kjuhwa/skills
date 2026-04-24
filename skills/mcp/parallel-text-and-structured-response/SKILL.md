---
name: parallel-text-and-structured-response
description: Return every MCP tool result as a parallel pair — a Markdown `content` array for humans/agents, and a `structuredContent` object with the exact same fields for programmatic consumers, gated by an `experimentalStructuredContent` flag.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, response-format, structured-content, dual-output, markdown]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/McpResponse.ts
imported_at: 2026-04-18T00:00:00Z
---

# Parallel Text + Structured Response

## When to use

- Your MCP tool output is consumed both by LLM agents (want Markdown they can reason about) and by downstream code (wants a typed JSON shape).
- You want *one code path* to produce both so they never drift.
- You want to ship the structured variant behind a flag so clients can opt in.

## How it works

- Build both representations in the same pass. For each section, push a human-readable line to a `response: string[]` array and assign a value to a key in `structuredContent: {...}`.
- Keep the field names in `structuredContent` mirrored with the sections in `content`. Example: text `## Network requests` → `structuredContent.networkRequests: [...]`; text `Emulating user agent: Foo` → `structuredContent.userAgent: "Foo"`.
- Final result: `{content: [{type:'text', text: response.join('\n')}, ...imageContent], structuredContent}`.
- Make `structuredContent` inclusion conditional on a startup flag (`experimentalStructuredContent`) so existing clients aren't broken by the addition.
- CLIs reading the response pick `format === 'json' ? structuredContent : content.text`.

## Example

```ts
format(toolName, ctx, data): { content, structuredContent } {
  const response: string[] = [];
  const structuredContent: any = {};

  if (this.#textResponseLines.length) {
    structuredContent.message = this.#textResponseLines.join('\n');
    response.push(...this.#textResponseLines);
  }

  if (page?.userAgent) {
    response.push(`Emulating user agent: ${page.userAgent}`);
    structuredContent.userAgent = page.userAgent;
  }

  if (data.networkRequests) {
    response.push('## Network requests');
    structuredContent.networkRequests = [];
    for (const f of paginated.items) {
      response.push(f.toString());
      structuredContent.networkRequests.push(f.toJSON());
    }
  }

  return {
    content: [{type:'text', text: response.join('\n')}, ...images],
    structuredContent: args.experimentalStructuredContent ? structuredContent : undefined,
  };
}
```

## Gotchas

- The invariant is: anything in text has a mirror key in structuredContent (and vice versa). Write a test that asserts both are populated for every known section.
- Omit `structuredContent` entirely (not an empty object) when the flag is off — some MCP clients crash on unexpected fields.
- Make every formatter (`NetworkFormatter`, `ConsoleFormatter`, etc.) expose both `toString()` and `toJSON()` / `toStringDetailed()` and `toJSONDetailed()`. Don't pass a formatter to one side and a random `{}` to the other.
- Pagination metadata, filter args, and emulation state all belong in structured content — otherwise a programmatic consumer has to regex Markdown.
- Don't JSON.stringify inside the Markdown text if the same data is in structuredContent — the agent gets duplicate cost.
