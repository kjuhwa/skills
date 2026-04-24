---
name: registeropenapiroute-wrapper
description: Thin wrapper around `@hono/zod-openapi`'s `app.openapi(route, handler)` that casts the handler to `never`, bypassing the TypedResponse constraint while keeping runtime Zod validation of inputs.
category: zod
version: 1.0.0
version_origin: extracted
tags: [zod, hono, openapi, typed-response, route-registration]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_knowledge: [zod-openapi-schema-conventions]
---

# `registerOpenApiRoute` Wrapper for `@hono/zod-openapi` Handlers

## When to use

- You use `@hono/zod-openapi` for API routes and want the OpenAPI spec generation + runtime Zod validation.
- Your handlers return `Response` built via `c.json(...)` / `c.text(...)` etc., but TypeScript's `TypedResponse` constraints from `app.openapi(route, handler)` keep fighting you (nested generics, conditional types, never-unions).
- You accept that response schemas are used for **spec only** — runtime validation is only on inputs — and you want a one-line escape hatch to declare that intent.

## Steps

1. **Define a local helper that casts the handler**:

   ```ts
   function registerOpenApiRoute(
     route: ReturnType<typeof createRoute>,
     handler: (c: Context) => Response | Promise<Response>,
   ): void {
     app.openapi(route, handler as never);
   }
   ```

   The `as never` cast is explicit; TypeScript's structural checker accepts `never` for anything. You've made the tradeoff visible.

2. **Add a second helper for validated body access** to keep handlers readable:

   ```ts
   function getValidatedBody<T>(c: Context, _schema: z.ZodType<T>): T {
     return (c.req as unknown as { valid(k: 'json'): T }).valid('json');
   }
   ```

   Handlers then call `const body = getValidatedBody(c, createCodebaseBodySchema);` and get typed, validated data.

3. **Register every route through the wrapper**, not `app.openapi(...)` directly. Makes it easy to grep:

   ```ts
   registerOpenApiRoute(createConversationRoute, async c => {
     const body = getValidatedBody(c, createConversationBodySchema);
     …
     return c.json({ conversation }, 201);
   });
   ```

4. **Document the tradeoff with a comment** next to the wrapper: "Zod validates inputs (query, params, body) at runtime via defaultHook. Response schemas are used for OpenAPI spec generation only — output is not validated at runtime. The `as never` cast bypasses TypedResponse constraints." (Archon's actual comment is at `api.ts:1638-1643`.)

5. **Use `z` from `@hono/zod-openapi`, not from `zod` directly.** The wrapper's re-export includes extension methods (`openapi()`) needed for spec generation. Root `CLAUDE.md` codifies this in the Zod Schema Conventions section.

6. **Route schemas per domain.** Archon's layout: `packages/server/src/routes/schemas/` with one file per domain (conversations, codebases, workflows). Engine schemas live elsewhere. Keep route contracts separate from engine/internal schemas.

7. **Serve the OpenAPI spec** in one line:

   ```ts
   app.doc('/api/openapi.json', {
     openapi: '3.0.0',
     info: { title: 'Archon API', version: '1.0.0' },
   });
   ```

## Counter / Caveats

- **Inputs are validated, outputs are not.** This is a feature for developer ergonomics, but it means a bug that returns the wrong shape will silently ship wrong data to clients. Pair this with OpenAPI-driven client code generation (`@hey-api/openapi-ts` in Archon's case) so consumers see mismatches at their compile time.
- **Don't** extend the wrapper to accept arbitrary middleware — keep it minimal. If you need Hono-level middleware, use `app.use()` separately.
- `as never` is pragmatic, not principled. If a future `@hono/zod-openapi` release ships better TypedResponse inference, drop the wrapper.
- Inside handlers, **never** access `c.req.json()` directly for a validated route — always use `getValidatedBody`. Bypassing the helper bypasses the validated type.
- If you need response-shape enforcement, add a separate test layer that boots the app and exercises each route; runtime validation is overkill in Hono for high-QPS endpoints.

## Evidence

- `packages/server/src/routes/api.ts:1638-1654`: both helpers with inline comments.
  ```ts
  function registerOpenApiRoute(route: ReturnType<typeof createRoute>, handler: (c: Context) => Response | Promise<Response>): void {
    app.openapi(route, handler as never);
  }
  function getValidatedBody<T>(c: Context, _schema: z.ZodType<T>): T {
    return (c.req as unknown as { valid(k: 'json'): T }).valid('json');
  }
  ```
- Spec serving at `api.ts:1657-1660`: `app.doc('/api/openapi.json', { openapi: '3.0.0', info: { title: 'Archon API', version: '1.0.0' } });`
- ~40+ handler registrations across `api.ts` all go through the wrapper (greppable via `registerOpenApiRoute(`).
- Root `CLAUDE.md` Zod Schema Conventions section (lines 21-30) codifies "All new/modified API routes must use `registerOpenApiRoute(createRoute({...}), handler)` — the local wrapper handles the TypedResponse bypass."
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
