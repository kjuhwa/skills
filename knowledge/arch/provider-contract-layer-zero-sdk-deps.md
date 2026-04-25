---
version: 0.1.0-draft
name: provider-contract-layer-zero-sdk-deps
summary: The interfaces that a workflow engine uses to talk to AI providers must live in a file with zero SDK imports and zero runtime side effects, so downstream packages don't inherit SDK deps.
category: arch
confidence: high
tags: [architecture, layering, providers, contract, sdk-deps]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [provider-registry-plugin-pattern]
---

# Provider Contract Layer With Zero SDK Dependencies

## Fact / Decision

When a system has a workflow engine that invokes multiple AI providers (Claude, Codex, Gemini, …), the `IAgentProvider` interface and its associated option/capability types must live in a file with a **hard "no SDK imports" rule**.

Concretely in Archon:

- `packages/providers/src/types.ts` declares `IAgentProvider`, `SendQueryOptions`, `MessageChunk`, provider-defaults interfaces, etc.
- The first line of the file is a comment: `// CONTRACT LAYER — no SDK imports, no runtime deps.`
- The file contains no import of `@anthropic-ai/claude-agent-sdk`, `@openai/codex-sdk`, or any other SDK.
- `@archon/workflows` and `@archon/core` import **only from this subpath** (`@archon/providers/types`), not from `@archon/providers` root.
- The actual provider implementations (`claude/provider.ts`, `codex/provider.ts`) live in sibling folders and each owns their SDK dep exclusively.

The payoff is that the workflow engine can be imported, tested, and (in theory) bundled without pulling Claude or Codex SDKs. Compiled binary size, TypeScript type-checking time, and installation speed all benefit.

## Why

AI SDKs are large (tens of MB when fully installed, MB of type declarations). Without the contract/implementation split, every downstream consumer that imports the engine also pulls in every provider's SDK, even if they use only one. Worse, a type change in one SDK can break compilation of the engine itself — that's a leak of implementation into contract.

The pattern generalizes beyond AI providers: any pluggable-backend architecture (databases, storage, logging, auth) benefits from a strict contract module. The enforcement must be lexical (a grep-able rule) not just "convention" — if it compiles, someone will import from it.

## Counter / Caveats

- You must split not just SDK types but SDK-adjacent types. Example: a `ModelReasoningEffort` enum that structurally matches Codex's SDK enum but is **re-declared** locally. Yes, that's duplication — accept it. The test that enforces "structurally matches" is cheap; the SDK dep you avoid is not.
- `@archon/workflows` re-exports contract types so `@archon/core` and UI layers don't need to know about the contract-subpath trick. But the engine itself imports from the contract subpath directly.
- Hard rule, hard rule. If one import sneaks in, you'll chase it for months. Add a lint rule (`no-restricted-imports`) or CI grep.
- Config-type surfaces (e.g. `ClaudeProviderDefaults`) can live in the contract layer as interfaces as long as they're structural; do not import the SDK's equivalent type.

## Evidence

- `packages/providers/src/types.ts:1-3`: header comment — "CONTRACT LAYER — no SDK imports, no runtime deps. @archon/workflows and @archon/core import from this subpath (@archon/providers/types). HARD RULE: This file must never import SDK packages or other @archon/* packages."
- Root `CLAUDE.md` (lines 411-417): "@archon/providers … owns SDK deps, IAgentProvider interface … `@archon/providers/types` is the contract subpath (zero SDK deps, zero runtime side effects) that @archon/workflows imports from."
- Same CLAUDE.md (line 415): "@archon/workflows … depends only on @archon/git + @archon/paths + @archon/providers/types + @hono/zod-openapi + zod; DB/AI/config injected via WorkflowDeps."
- Structural type duplication example at `packages/providers/src/types.ts:22-32` — `CodexProviderDefaults.modelReasoningEffort` comment says "Structurally matches @archon/workflows ModelReasoningEffort."
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
