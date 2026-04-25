---
name: blocked-env-vars-for-mcp-subprocess
summary: The denylist of environment variables stripped before spawning a stdio MCP subprocess — sensitive app/auth tokens and well-known third-party API keys.
category: security
tags: [mcp, env-vars, subprocess, denylist]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/mcp/client.ts
imported_at: 2026-04-18T00:00:00Z
---

# Blocked env vars for MCP subprocesses

When Craft Agents spawns a local stdio-transport MCP server (e.g. `npx @somebody/some-mcp`), it filters its environment. The current denylist (`packages/shared/src/mcp/client.ts`, duplicated in `packages/session-tools-core/src/handlers/transform-data.ts`):

**App auth** — set by Craft Agents itself, must not leak to arbitrary subprocesses:
- `ANTHROPIC_API_KEY`
- `CLAUDE_CODE_OAUTH_TOKEN`

**AWS credentials**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

**Common third-party tokens** users often put in their shell env:
- `GITHUB_TOKEN`, `GH_TOKEN`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `STRIPE_SECRET_KEY`
- `NPM_TOKEN`

### Rationale
Users add MCP servers the same way they add npm packages — anything with a `command` + `args` entry. Your shell env is full of secrets the MCP doesn't need. The app's own auth tokens (`ANTHROPIC_API_KEY`) would let the MCP impersonate the agent by calling Anthropic directly.

### Escape hatch
Per-source `env: { FOO: 'bar' }` in source config passes specific vars the user explicitly wants the MCP to see — the opt-in is at the source-definition level, audited once per add.

### Limitations
- Denylist, not allowlist — new popular token names appear constantly. Audit every few months.
- Windows env isn't case-sensitive; ensure the filter does case-insensitive matching if you port.
- Doesn't prevent an MCP from reading `~/.aws/credentials` or `~/.npmrc` directly. File-system isolation would need OS-level sandboxing (firejail, App Sandbox), which Craft Agents does NOT do.
- The duplication between `mcp/client.ts` and `session-tools-core/transform-data.ts` is a real maintenance risk; both files cite each other in comments.

### If you adopt this pattern
- Keep the list in one module, import from both spawn sites.
- Consider also filtering `_*`, `npm_*`, `CARGO_*` since those often leak package-registry tokens.
- Document the list publicly so users know what's filtered vs passed.
