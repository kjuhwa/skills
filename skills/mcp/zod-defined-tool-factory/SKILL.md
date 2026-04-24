---
name: zod-defined-tool-factory
description: Wrap MCP tool definitions in a typed `defineTool` helper so zod schemas drive both runtime validation and the handler's TypeScript param types, with a separate `definePageTool` variant for tools that need a pre-resolved page context.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, zod, typescript, tool-definition, dx]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/ToolDefinition.ts
imported_at: 2026-04-18T00:00:00Z
---

# Typed Tool Definition Factory

## When to use

- You have an MCP (or similar JSON-schema-driven) tool system with many tools and want zero drift between the declared schema and the handler's param types.
- Some tools need extra setup (e.g. a pre-resolved "current page" or DB connection) that you don't want to copy-paste into every handler.
- You want to generate docs or a CLI from the same tool definitions at build time.

## How it works

- Define `BaseToolDefinition<Schema extends zod.ZodRawShape>` with `name`, `description`, `annotations`, `schema`. Keep `Schema` generic so TypeScript can infer param types from zod.
- Provide `defineTool(def)` that simply returns its argument but narrows the generic. The handler signature is typed as `(request: { params: zod.objectOutputType<Schema, ZodTypeAny> }, response, context) => Promise<void>`.
- Provide a second overload `defineTool(factoryFn)` that accepts a function of parsed CLI args, returning a tool. This lets tools adjust schema/behavior based on startup flags.
- For the "needs a page" case, add `definePageTool` that stamps `pageScoped: true` and a widened handler signature `(request & { page: ContextPage }, response, context)`. The server dispatcher checks `pageScoped` and resolves the page before invoking the handler.
- Export common schema fragments (`pageIdSchema`, `timeoutSchema`, transforms like `viewportTransform`) so tools share exact wording and validation.

## Example

```ts
export const takeSnapshot = definePageTool({
  name: 'take_snapshot',
  description: 'Take a text a11y snapshot of the selected page.',
  annotations: { category: ToolCategory.DEBUGGING, readOnlyHint: false },
  schema: {
    verbose: zod.boolean().optional().describe('Include all a11y attrs.'),
    filePath: zod.string().optional().describe('Save to file instead.'),
  },
  // `request.params.verbose` is typed as `boolean | undefined`.
  // `request.page` is present because of definePageTool.
  handler: async (request, response) => {
    response.includeSnapshot({
      verbose: request.params.verbose ?? false,
      filePath: request.params.filePath,
    });
  },
});
```

## Gotchas

- `zod.ZodRawShape` is the raw property map, not a compiled object schema — don't wrap the schema in `zod.object(...)` or you lose the overload matching.
- Runtime schema walkers (for docs or telemetry) must handle `ZodOptional`, `ZodDefault`, and `ZodEffects` by unwrapping `_def.innerType` / `_def.schema` recursively — otherwise they misread types.
- Factory-variant tools `(args) => def` must be detected with `typeof tool === 'function'` at registration time; mixing eager and lazy tools in one array otherwise produces "tool.name is undefined" bugs.
- Keep the handler signature `Promise<void>`: side-effecting the response builder is the contract. Returning a value is a smell that the builder abstraction is leaking.
