---
version: 0.1.0-draft
name: experimental-structured-content-flag
summary: MCP structured-content support is gated behind an `experimentalStructuredContent` flag because not all MCP clients parse the field and including it unconditionally can crash older clients; ship it as opt-in during the rollout window.
category: decision
confidence: medium
tags: [mcp, backwards-compat, feature-flags, structured-content]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# `experimentalStructuredContent` Flag

## Context

The MCP protocol added a `structuredContent` field on `CallToolResult` after the initial spec. An MCP server that always returns `{content, structuredContent}` looks correct per the latest spec but was observed to crash older client implementations that strict-parse to the original shape.

## The fact / decision / pitfall

Chrome DevTools MCP gates structured-content emission on a CLI flag `--experimental-structured-content`. When off, the server returns only `{content}`. When on, it returns both. The same gate is forced-on by the CLI in daemon mode (`--viaCli` implies `--experimentalStructuredContent`), because its own daemon consumer explicitly parses structured content.

Implementation:

```ts
if (serverArgs.experimentalStructuredContent) {
  result.structuredContent = structuredContent;
}
```

When the flag stays off, no behavioral difference from legacy clients' perspective.

## Evidence

- `src/index.ts::createMcpServer` — `result.structuredContent = structuredContent as Record<string, unknown>;` only inside `if (serverArgs.experimentalStructuredContent)`.
- `src/bin/chrome-devtools.ts` — `const defaultArgs = ['--viaCli', '--experimentalStructuredContent'];`
- `src/bin/chrome-devtools.ts` deletes `experimentalStructuredContent` from CLI-user-visible flags because it's always on from the CLI.

## Implications

- Client-visible behavioral changes need a flag, not a silent default flip. Even "more information" is a breaking change for strict consumers.
- Keep the flag name `experimental-*` while the spec is in flux; remove the prefix when the protocol level stabilizes.
- Document which client versions handle structured content. Users configuring Claude Desktop or similar want to know "can I turn this on?".
- Downstream CLIs that fully consume the server (like the daemon bridge) can default the flag to on since they control both sides. That's the pattern used here.
- When eventually promoting to default-on, keep the flag as a kill switch for at least one release cycle in case a user reports a client regression.
