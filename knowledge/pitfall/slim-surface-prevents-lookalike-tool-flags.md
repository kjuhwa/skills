---
version: 0.1.0-draft
name: slim-surface-prevents-lookalike-tool-flags
summary: In slim MCP mode, category and experimental flags that control the full tool surface should be *deleted* from the CLI surface, not passed with a default — otherwise users try to enable features that slim mode doesn't support and get confusing errors.
category: pitfall
confidence: medium
tags: [mcp, slim, cli, feature-flags]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/bin/chrome-devtools.ts
imported_at: 2026-04-18T00:00:00Z
---

# Slim Mode Hides Lookalike Flags

## Context

When you ship two tool surfaces (slim vs. full) from one binary with a single `--slim` flag, the other feature/category flags (like `--category-performance` or `--experimental-vision`) still exist in the CLI options object. They simply do nothing in slim mode because the slim tool list doesn't include those categories.

Letting them through confuses users: they pass `--experimental-vision --slim` and expect vision, get nothing, no error.

## The fact / decision / pitfall

Delete those flags from the CLI surface in slim-consuming binaries (like the CLI wrapper). chrome-devtools-mcp does this explicitly in `src/bin/chrome-devtools.ts`:

```ts
const startCliOptions = {...cliOptions};
delete startCliOptions.experimentalPageIdRouting;
delete startCliOptions.experimentalVision;
delete startCliOptions.experimentalWebmcp;
delete startCliOptions.experimentalInteropTools;
delete startCliOptions.experimentalScreencast;
delete startCliOptions.categoryEmulation;
delete startCliOptions.categoryPerformance;
delete startCliOptions.categoryNetwork;
delete startCliOptions.categoryExtensions;
// Always on in CLI:
delete startCliOptions.experimentalStructuredContent;
```

The underlying MCP server still accepts the flags (they're valid when slim is off), but the CLI user doesn't see them and can't pass them, avoiding the silent no-op.

## Evidence

- `src/bin/chrome-devtools.ts` lines 40–62 — the explicit deletes with explanatory comments.

## Implications

- A CLI is a curated subset of the server's options, not a passthrough. Own the editorial layer.
- When adding a new feature flag, decide at that moment whether it's slim-compatible and update the deletion list in the CLI wrapper. Treat it as part of the feature's definition-of-done.
- Document the difference ("these flags only apply in full mode") inline in the CLI's `--help` output too; some users will discover the option via `--server-flag=X` in daemon start.
- If a flag is genuinely impossible in slim mode (not just unused), prefer to *reject* it at parse time with a helpful error rather than silently ignoring. chrome-devtools-mcp's approach is the softer deletion; sharper servers can go harder.
