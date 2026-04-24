---
name: provider-registry-plugin-pattern
description: Structure AI-agent providers as a typed registry of `{id, displayName, factory, capabilities, isModelCompatible, builtIn}` records, with a separate idempotent aggregator function for community providers.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [providers, plugin, registry, ai-agent, extensibility]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_knowledge: [provider-contract-layer-zero-sdk-deps]
---

# Pluggable AI-Agent Provider Registry with Community Aggregator

## When to use

- Your tool supports multiple AI back-ends (Claude, Codex, Gemini, …). Each has its own SDK, capability set, and model-compatibility rules.
- You want adding a **new** provider to be a localized change: drop files into a folder, add one line to an aggregator, done. No edits to entry points, no edits to config types, no edits to UI surfaces.
- Built-in providers and community providers should be addressable by the same API but trackable via a `builtIn` flag (UI badging, release notes, support guarantees).

## Steps

1. **Define the registration record type** with everything a caller needs:

   ```ts
   interface ProviderRegistration {
     id: string;                     // stable key, e.g. 'claude'
     displayName: string;            // UI label
     factory: () => IAgentProvider;  // instantiation on demand
     capabilities: ProviderCapabilities;
     isModelCompatible: (model: string) => boolean;
     builtIn: boolean;
   }
   ```

2. **Back it with a module-scoped `Map<string, ProviderRegistration>`.** Expose:
   - `registerProvider(entry)` — idempotent-style: throw on duplicate ID (catches copy-paste bugs).
   - `isRegisteredProvider(id)` — so aggregators can be called multiple times safely.
   - `getAgentProvider(id)` → returns the instantiated provider; throws `UnknownProviderError` with the known-IDs list for a good error message.
   - `getProviderCapabilities(id)` and `getProviderInfoList()` — capabilities without instantiating (UI can show cards without spinning up SDKs).

3. **Write `registerBuiltinProviders()` that skips IDs already in the registry.** This lets it be called multiple times from different entry points without coordination. Each built-in is a struct literal (no class registration DSL needed):

   ```ts
   if (!registry.has('claude')) registry.set('claude', { id: 'claude', factory: () => new ClaudeProvider(), ... builtIn: true });
   ```

4. **Co-locate each community provider in `providers/community/<id>/`** with three required files: `provider.ts` (implements `IAgentProvider`), `capabilities.ts` (static capability struct), `registration.ts` (exports `register<Name>Provider()` that calls `registerProvider({...})` unless already registered).

5. **Add a separate `registerCommunityProviders()` aggregator** that's just a flat list of `register*Provider()` calls:

   ```ts
   export function registerCommunityProviders(): void {
     registerPiProvider();
     // registerFooProvider();  // future
   }
   ```

   This is the "one line to add a new provider" commit.

6. **Call both aggregators from every entry point.** Idempotency makes this safe — Archon calls them from CLI init (`cli.ts:47-49`), server startup, and the config loader.

7. **Keep the contract layer free of SDK imports.** In Archon, `packages/providers/src/types.ts` has a hard rule banned SDK imports in the module comment; `@archon/workflows` and `@archon/core` import only from this subpath.

8. **Export a test-only `clearRegistry()`** marked `@internal`. Tests that exercise registration need a clean slate.

## Counter / Caveats

- **Don't** use a `require`-walking auto-discovery to find community providers. That breaks tree-shaking, breaks compiled binaries (no filesystem), and makes the set of registered providers depend on packaging. Explicit imports in the aggregator beat magic every time.
- **`isModelCompatible` must cover the 'inherit' alias** (and any shared aliases). Archon's Claude accepts `sonnet`, `opus`, `haiku`, `claude-*`, `inherit`; Codex accepts "anything that isn't a Claude alias." Simpler to express as two inverse predicates than to maintain overlapping allowlists.
- Do **not** include provider-specific SDK option types in the contract layer. Translate raw `nodeConfig` + `assistantConfig` into SDK options *inside* each provider's `sendQuery()`. That keeps the engine provider-agnostic.
- Bake `builtIn: false` into every community registration until the provider is promoted. UI and docs should treat the boolean as load-bearing, not cosmetic.

## Evidence

- `packages/providers/src/registry.ts` (171 lines): complete implementation including `registerProvider`, `getAgentProvider`, `getProviderCapabilities`, `getProviderInfoList`, `registerBuiltinProviders`, `registerCommunityProviders`, `clearRegistry`.
- `ProviderRegistration` type at `packages/providers/src/types.ts`.
- Community provider example: `packages/providers/src/community/pi/registration.ts` (27 lines) — idempotent `registerPiProvider()` with `isRegisteredProvider('pi')` guard.
- `registerCommunityProviders()` at `registry.ts:164-166` with design-intent comment (lines 144-163) explaining the Phase-2 community-provider seam.
- Used from CLI entry: `packages/cli/src/cli.ts:47-49`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
