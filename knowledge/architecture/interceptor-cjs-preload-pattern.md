---
version: 0.1.0-draft
name: interceptor-cjs-preload-pattern
summary: The unified-network-interceptor is a TS file bundled to CJS with esbuild and loaded into every SDK subprocess via --require/--preload to patch globalThis.fetch before the SDK captures it — the only reliable way to observe/modify LLM HTTP traffic.
category: architecture
tags: [interceptor, fetch, node-require, bun-preload, cjs-bundle]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/unified-network-interceptor.ts
imported_at: 2026-04-18T00:00:00Z
---

# Interceptor CJS preload pattern

### The problem
Craft Agents needs to:
1. Inject `_intent` + `_displayName` metadata into MCP tool schemas on outgoing LLM requests.
2. Strip those metadata fields from Anthropic SSE stream responses BEFORE the SDK parses them (strict validation).
3. Capture the full `_intent` passthrough for OpenAI-format responses.
4. Capture API errors (4xx/5xx) for the host-side error-diagnostic system.
5. Route through HTTPS_PROXY / NO_PROXY settings.
6. Enable / disable feature flags (Fast Mode, Extended Prompt Cache, 1M Context) at the request level.

None of this can be done from the host — by the time the host knows the SDK has started, the SDK has already captured its own `fetch` reference.

### The solution
Write the interceptor as a self-contained TS module with import-time side effects on `globalThis.fetch`. Bundle it as CJS:

```
bun run esbuild packages/shared/src/unified-network-interceptor.ts \
  --bundle --platform=node --format=cjs \
  --outfile=apps/electron/dist/interceptor.cjs
```

Spawn every SDK subprocess with:
- Node: `--require /abs/path/interceptor.cjs`
- Bun: `--preload /abs/path/interceptor.cjs`

This loads + runs the interceptor BEFORE any application code. It wraps `globalThis.fetch`; all subsequent captures see the wrapper.

### Per-API-format behavior
The interceptor auto-detects based on URL:
- `/messages` → Anthropic format. Strip metadata from SSE deltas (SDK validates strictly).
- `/chat/completions` → OpenAI format. Let metadata pass through (OpenAI schema tolerates); a downstream hook strips later.

### Re-injection on follow-up turns
Tool metadata is stored in an in-memory `toolMetadataStore` keyed by tool-use-id. On follow-up assistant messages that reference previous tool calls, the interceptor re-injects the metadata so the LLM's history view stays consistent.

### Bundle requirements
- CJS format — `--require` doesn't accept ESM.
- Bundle everything (no `packages:external`) — the subprocess doesn't have YOUR node_modules.
- Keep it small — it runs on every subprocess start.
- Don't use top-level `await`; it breaks CJS.

### Shipping in packaged builds
`apps/electron/electron-builder.yml` explicitly lists:
```yaml
files:
  - packages/shared/src/unified-network-interceptor.ts
  - packages/shared/src/interceptor-common.ts
  - packages/shared/src/feature-flags.ts
  - packages/shared/src/interceptor-request-utils.ts
```
— because these are loaded at runtime; electron-builder doesn't know to include them otherwise.

### Reference
- `packages/shared/src/unified-network-interceptor.ts` (the interceptor itself).
- `packages/shared/src/interceptor-common.ts` (shared error store + metadata store).
- `scripts/electron-build-main.ts#buildInterceptor`.
