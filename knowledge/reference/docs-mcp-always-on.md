---
version: 0.1.0-draft
name: docs-mcp-always-on
summary: Craft Agents wires craft-agents-docs as an always-available MCP server pointing at https://agents.craft.do/docs/mcp inside craft-agent.ts — not a user-configurable source — so the agent always has access to product docs for search.
category: reference
tags: [mcp, docs, always-on, craft-agents-docs]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/agent/claude-agent.ts
imported_at: 2026-04-18T00:00:00Z
---

# Always-on docs MCP

### What
Regardless of user configuration, the Craft Agents agent always has access to the `craft-agents-docs` MCP server — a Mintlify-backed HTTP MCP at `https://agents.craft.do/docs/mcp`. Lets the agent search product docs / source setup guides in-session ("how do I connect Linear?").

### How
Hardcoded in `packages/shared/src/agent/claude-agent.ts` as part of the SDK options, not in the sources registry. Previously was a "built-in source" (`packages/shared/src/sources/builtin-sources.ts` returned it); was moved to an always-available MCP entry to skip source-enabling UX friction.

### Why the move
As a source, users had to "enable" it or see it cluttering their source list. As an always-on MCP, it's invisible to users but always available to the agent. The agent mentions it implicitly: when you ask "how do I set up Slack", the agent calls `craft-agents-docs` tools without prompting you to connect anything.

### User impact
Quiet improvement — nothing to enable, it "just works". The docs source slug `craft-agents-docs` still exists for backward compatibility but `getBuiltinSources()` returns empty.

### Replication pattern for other apps
If your agent app has first-party docs that should always be searchable:
1. Wire the MCP server directly into your agent's options, not through the user-facing sources system.
2. Mark it distinct in `_displayName` so UI can show "searching docs" rather than pretending it's a generic source.
3. Keep the hardcoded URL in a single constant so rebranding / domain change is a one-liner.

### Reference
- `packages/shared/src/agent/claude-agent.ts` (where the always-available MCP gets added).
- `packages/shared/src/sources/builtin-sources.ts` (deprecated place, now returns empty).
- The `mintlify` provider-name hint in `builtin-sources.ts` (comments) documents the migration.
