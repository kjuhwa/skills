---
name: file-path-reference-for-heavy-assets
description: For heavy MCP tool outputs (screenshots, traces, videos, heap snapshots), write the asset to a file and return only its path in the tool response — never inline megabytes of base64 into the response stream.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, file-reference, token-budget, design-principle, assets]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: docs/design-principles.md
imported_at: 2026-04-18T00:00:00Z
---

# Reference-Over-Value for Heavy Tool Outputs

## When to use

- Your MCP tool produces artifacts bigger than a few KB: screenshots, performance traces, heap snapshots, recorded videos, generated PDFs.
- You want every tool result to fit within a small fraction of the agent's context window.
- Downstream tools (image viewers, trace analyzers) can consume the asset from disk.

## How it works

- Add an optional `filePath` parameter to every asset-producing tool's schema. If the user supplies it, save there. If omitted, save to a temp file and return that path.
- Expose two helpers on `Context`: `saveTemporaryFile(data, filename)` (OS temp dir, auto-unique name) and `saveFile(data, clientProvidedPath, extension)` (resolves relative paths against CWD, validates the extension against a union type).
- In the response, append a single line: `"Saved to /path/to/file.ext."`. Put the path in `structuredContent.<toolName>FilePath` too.
- For MCP image content specifically, you may attach `{type:'image', data, mimeType}` when the client supports inline images — but treat that as an exception, not the rule.

## Example

```ts
// schema fragment
schema: {
  filePath: zod.string().optional().describe('Absolute or CWD-relative path. If omitted, uses a temp file.'),
}

// handler
const png = await page.screenshot({type: 'png'});
if (request.params.filePath) {
  const {filename} = await context.saveFile(png, request.params.filePath, '.png');
  response.appendResponseLine(`Saved screenshot to ${filename}.`);
} else {
  const {filepath} = await context.saveTemporaryFile(png, 'screenshot.png');
  response.appendResponseLine(`Saved screenshot to ${filepath}.`);
}
```

## Gotchas

- Enforce the extension via a union type (`.png | .jpeg | .webp | .json | .txt | .network-response | ...`). Don't let callers write arbitrary extensions; it's a correctness *and* a security gate.
- Resolve user-provided paths against `process.cwd()` predictably and warn (but allow) absolute paths. Document the rule.
- Don't silently overwrite existing files. `saveFile` should fail closed unless the caller opts into overwrite — or attach a short random suffix to avoid it.
- For traces, support `.gz` via `zlib.gzip` when the user chose `.json.gz` as the extension — a 200MB trace compresses to ~10MB and round-trips via file references.
- Pair this pattern with a short human-readable summary (LCP, score, request count). Agents shouldn't need to open the file to answer common questions.
