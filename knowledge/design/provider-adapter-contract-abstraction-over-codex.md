---
version: 0.1.0-draft
name: provider-adapter-contract-abstraction-over-codex
summary: T3 Code defines a ProviderAdapter interface so multiple agent backends (Codex, Claude, OpenCode) can be swapped
type: knowledge
category: design
confidence: medium
tags: [design, provider, abstraction]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/provider-architecture.md
  - apps/server/src/provider/Layers/ClaudeAdapter.ts
  - apps/server/src/provider/Layers/CodexAdapter.ts
---

## Fact
Codex is currently the only fully implemented provider, but T3 Code abstracts provider backends behind a `ProviderAdapter` interface. New providers (Claude via Claude Code, OpenCode, others) can be added by implementing the adapter. The interface defines session lifecycle, streaming events, and command execution.

## Why it matters
1. **Vendor lock-in avoided** — if Codex changes terms or shuts down, switching to Claude is architectural, not rewrite
2. **Multi-provider support** — users can choose which agent runs their thread
3. **API consistency** — all providers expose the same interface; UI doesn't need per-provider logic
4. **Testing** — test providers (mock adapters) can be swapped in for deterministic testing

## Evidence
- Provider architecture doc mentions Codex, Claude, and OpenCode
- Contracts define ProviderAdapter shape: `startSession()`, `sendTurn()`, `respondToRequest()`, etc.
- ProviderRegistry manages multiple adapters; routes to the one the thread is bound to
- Commit "Add ACP support with Cursor provider (#1355)" shows new adapter additions

## How to apply
- To add a new provider, implement the ProviderAdapter interface for that backend
- Register it in ProviderRegistry under a unique name (e.g., `'claude'`, `'opencode'`, `'cursor'`)
- UI automatically shows the provider in dropdowns
- Document the adapter's capabilities (models, modes, features) in contracts
- Write integration tests against the adapter to validate compatibility
