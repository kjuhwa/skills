---
version: 0.1.0-draft
name: zod-openapi-schema-conventions
summary: Use `@hono/zod-openapi`'s `z` (not `zod` directly), derive types with `z.infer<typeof X>`, co-locate route schemas per domain, and derive enum constants from `schema.options` instead of duplicating arrays.
category: api
confidence: high
tags: [zod, openapi, hono, schema, conventions]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [registeropenapiroute-wrapper]
---

# Zod + `@hono/zod-openapi` Conventions

## Fact / Decision

When building a Hono API with OpenAPI-style validation via `@hono/zod-openapi`, adopt these conventions across the codebase and enforce them in `CLAUDE.md` / style guide:

1. **Schema naming: camelCase with descriptive suffix.** `workflowRunSchema`, `errorSchema`, `createCodebaseBodySchema`, `dagNodeSchema`. Not `WorkflowRun` (reserved for the inferred type), not `workflowRun` (ambiguous).

2. **Type derivation: always `z.infer<typeof schema>`**. Never write parallel hand-crafted interfaces. If you need `WorkflowRun`, you write:

   ```ts
   export const workflowRunSchema = z.object({ … });
   export type WorkflowRun = z.infer<typeof workflowRunSchema>;
   ```

3. **Import `z` from `@hono/zod-openapi`, not `zod`.** The re-exported `z` has the `.openapi()` extension for attaching OpenAPI metadata to schemas. Importing from `zod` directly drops that method and breaks spec generation at runtime.

4. **All new/modified API routes use `registerOpenApiRoute(createRoute({...}), handler)`** — the local wrapper that handles the TypedResponse bypass with an explicit `as never` cast. Never call `app.openapi(...)` directly.

5. **Route schemas per domain in `src/routes/schemas/`**, one file per domain (conversations, codebases, workflows, messages, providers). Keep route contracts separate from engine/internal schemas.

6. **Engine schemas in `packages/workflows/src/schemas/`**, one file per concern (dag-node, workflow, workflow-run, retry, loop, hooks), with an `index.ts` that re-exports all. Engine schema naming is camelCase too (`dagNodeSchema`, `workflowBaseSchema`, `nodeOutputSchema`).

7. **Derive enum-like arrays from `schema.options`, never duplicate.** Example:

   ```ts
   export const TRIGGER_RULES = triggerRuleSchema.options; // ['all', 'any', 'none']
   ```

   Exception: when the web package imports only from the type-only generated `api.generated.d.ts`, it must define its own local constant because runtime values can't come from a `.d.ts`. Document the exception explicitly.

8. **Use `.safeParse()` for validation at module boundaries** (e.g. YAML-loaded workflow nodes in `loader.ts`). For graph-level checks that Zod can't express (cycles, deps, `$nodeId.output` refs), keep imperative code in a separate `validateDagStructure()` step.

## Why

These conventions push:

- **Single source of truth** — types flow from schemas, not parallel interfaces. A rename in the schema updates every call site.
- **OpenAPI discoverability** — clients get typed SDKs from the generated spec, with field-level docs coming from `.openapi()` metadata.
- **Runtime safety at the boundaries** — Zod validates inputs; core code can assume the branded types are well-formed.
- **Maintenance** — consistent imports and naming make automated refactors possible.

The `schema.options` rule in particular has saved many drift bugs where an enum value was added to the schema but not to the TypeScript union used for switch-case coverage.

## Counter / Caveats

- `z.infer` on `.transform()`-heavy schemas gets the **output** type, not the input. For cases where you need both (API body vs internal representation), explicitly name both: `WorkflowRunInput = z.input<…>` and `WorkflowRunOutput = z.output<…>`.
- Don't `.openapi({})` every field — only add metadata when it adds value (description, example). Verbosity here makes schemas unreadable.
- When upgrading `@hono/zod-openapi` or `zod`, run the full test suite — subtle inference differences between patch versions have caused regressions.
- These conventions are Archon-specific but transfer cleanly to any Hono + Zod + OpenAPI stack.

## Evidence

- Root `CLAUDE.md` lines 21-30: the "Zod Schema Conventions" section encodes every rule above verbatim.
- `packages/server/src/routes/schemas/` directory structure (one file per domain).
- `packages/workflows/src/schemas/` directory: `dag-node.ts`, `workflow.ts`, `workflow-run.ts`, `loop.ts`, `hooks.ts`, `index.ts` re-export.
- `registerOpenApiRoute` wrapper at `packages/server/src/routes/api.ts:1638-1649`.
- Example `schema.options` derivation referenced in CLAUDE.md (`TRIGGER_RULES` / `WORKFLOW_HOOK_EVENTS` derived from `triggerRuleSchema.options`).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
