---
name: slim-tool-variant
description: Ship a "slim" alternate tool set selectable by a single CLI flag to give context-budget-sensitive clients a drastically smaller prompt surface while keeping the full-featured set available.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, tool-design, context-window, prompt-size, configuration]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/slim/tools.ts
imported_at: 2026-04-18T00:00:00Z
---

# Slim Tool Set Variant

## When to use

- Your MCP server's full tool list eats a meaningful chunk of the agent's context window (e.g. ~20-50 tools with multi-hundred-token descriptions each).
- Some callers (small-context models, constrained harnesses) would rather have 3 well-chosen tools than 40 finely-tuned ones.
- You have capable primitives (`navigate`, `screenshot`, `evaluate`) that can approximate most of what specialized tools do.

## How it works

- Put the slim surface in its own module (e.g. `src/tools/slim/tools.ts`) exporting a handful of "swiss-army-knife" tools with minimal descriptions and tiny schemas.
- At tool-creation time, branch on a single CLI flag: `const raw = args.slim ? Object.values(slimTools) : [...all tool modules]`. Everything downstream (registration, doc gen, CLI gen) reads from that single list.
- Wire a separate response class (`SlimMcpResponse`) that omits the auto-included sections (pages list, redaction verbiage, etc.) so even the response body is lean.
- Generate two reference docs from the same pipeline: call `createTools({slim:false})` and `createTools({slim:true})`, measure tokens of each with `tiktoken`, and publish both. Include the token count in the doc title so users can compare at a glance.
- In slim mode, also disable the optional page-id routing and structured-content flags so there are no hidden extras to explain.

## Example

```ts
// src/tools/slim/tools.ts - three tools, crisp schemas.
export const screenshot = definePageTool({
  name: 'screenshot', description: 'Takes a screenshot',
  schema: {},
  handler: async (req, res, ctx) => {
    const png = await req.page.pptrPage.screenshot({type: 'png', optimizeForSpeed: true});
    const { filepath } = await ctx.saveTemporaryFile(png, 'screenshot.png');
    res.appendResponseLine(filepath);
  },
});
export const navigate = definePageTool({/* url only */});
export const evaluate = definePageTool({/* script only */});

// src/tools/tools.ts
export const createTools = (args) => {
  const rawTools = args.slim ? Object.values(slimTools) : [...allTools];
  /* ... */
};
```

## Gotchas

- Measure the slim surface in tokens (cl100k_base or the target model's tokenizer) and make it a regression test — otherwise descriptions drift and "slim" creeps back toward "fat".
- Don't share schema fragments with the full set if it would pull in rich `.describe()` text; the slim description is often intentionally terser.
- If your slim `evaluate` is essentially a JS eval, document the security trade-off: the user is handing the agent arbitrary code execution on the page. Some clients won't want it enabled.
- Keep slim tool names *identical* to the full set where they overlap, so scripts written against slim also work against full.
