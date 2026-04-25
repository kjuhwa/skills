---
version: 0.1.0-draft
name: source-types-catalog
summary: The three source types Craft Agents can connect to (MCP server, REST API, local folder) with common providers pre-configured (Gmail, Calendar, Drive, YouTube, Slack, Microsoft, Obsidian, filesystem).
category: reference
tags: [sources, mcp, api, integrations]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/sources/types.ts
imported_at: 2026-04-18T00:00:00Z
---

# Source types catalog

Craft Agents "sources" are external data integrations. Three types:

### 1. MCP sources (`type: "mcp"`)
Connect to any Model Context Protocol server — stdio or HTTP transport.

Examples shipped:
- Linear, GitHub, Notion (HTTP MCP).
- User-provided stdio: `npx @some/mcp-server` with env vars in source config.
- Built-in: `craft-agents-docs` — always-available in-process MCP serving app docs.

### 2. API sources (`type: "api"`)
Wrap a REST API to expose tool-call-like operations. Craft Agents ships pre-made API sources with OAuth flows for:
- Google: Gmail, Calendar, Drive, YouTube, Search Console (user brings their own OAuth client ID/secret).
- Slack: baked-in OAuth (user doesn't see the secret).
- Microsoft: baked-in OAuth.

Each API source is a JSON spec describing endpoints; the agent calls them through `api-source-pool-client.ts` which adapts API calls into the MCP tool shape for uniform dispatch.

### 3. Folder sources (`type: "folder"`)
Local filesystem read/search:
- Filesystem: point at a directory, agent can Read/Grep.
- Obsidian vaults: special handling for Markdown + YAML frontmatter.
- Git repos: added as filesystem source with Git-aware tools.

### Common structure
Every source has:
- `id`, `slug`, `name`, `tagline`, `icon`.
- `enabled`, `isAuthenticated`, `connectionStatus`.
- `provider` key (e.g. `gmail`, `linear`, `filesystem`).
- Provider-specific config under `mcp`, `api`, or `folder` fields.
- Stored at `<workspace>/sources/<slug>/config.json`.

### Credential flow
- Credentials stored in the encrypted `~/.craft-agent/credentials.enc`.
- At session start, parent process decrypts and writes to `.credential-cache.json` (0600) inside the source folder.
- Subprocess reads the cache on each call — so refreshed credentials take effect without re-spawn.

### Adding a custom source
Paste an OpenAPI spec → the agent parses, writes a source config, guides the user through auth. No code change needed. That's the "add anything" promise from the README.

### Reference
- `packages/shared/src/sources/types.ts` — type definitions.
- `packages/shared/src/sources/builtin-sources.ts`, `storage.ts`, `credential-manager.ts`.
- `packages/shared/src/mcp/api-source-pool-client.ts` — REST-to-MCP adapter.
