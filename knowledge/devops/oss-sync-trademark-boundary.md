---
version: 0.1.0-draft
name: oss-sync-trademark-boundary
summary: The craft-agents-oss repo is the Apache-2.0 subset of an internal repo; oss-sync script and TRADEMARK.md define the legal boundary — code is open, 'Craft' and 'Craft Agents' names are trademarked, afterPack hooks and Pi agent bits are optionally stripped.
category: devops
tags: [oss, licensing, trademark, apache-2.0]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: LICENSE
imported_at: 2026-04-18T00:00:00Z
---

# OSS sync and trademark boundary

### Licensing
- Code: Apache 2.0 (`LICENSE`).
- Third-party: Claude Agent SDK is subject to Anthropic's Commercial ToS.
- Names: "Craft" and "Craft Agents" are trademarks of Craft Docs Ltd. (`TRADEMARK.md`).

### OSS sync mechanism
`package.json` exposes `bun run oss:sync` (`scripts/oss-sync.ts`). Purpose: keep `craft-agents-oss` in sync with an internal "full" repo by stripping certain files / dirs that Craft Docs Ltd. keeps proprietary (e.g. signed release infrastructure, marketing-specific assets, telemetry endpoints).

Evidence in the code:
- `"!apps/online-docs"` in `workspaces` — the Mintlify docs are not published to OSS.
- `existsSync(join(PI_AGENT_SERVER_DIR, 'src')) ? build : skip` in build scripts — Pi agent server is optionally absent from OSS forks.
- `apps/marketing/` is in the repo but builds don't require it.

### What forking looks like
If you fork craft-agents-oss to build your own agent app:
1. Rename `@craft-agent/*` workspace packages to your scope. Search-replace `@craft-agent/` across the tree.
2. Change `appId`, `productName`, `artifactName` in `apps/electron/electron-builder.yml`.
3. Change `CRAFT_DEEPLINK_SCHEME`, `CRAFT_APP_NAME` defaults.
4. Rename `~/.craft-agent` config dir (see `getDefaultWorkspacesDir`).
5. Remove references to `https://agents.craft.do` (auto-update publish URL, docs links).
6. Respect TRADEMARK.md — don't use Craft's name, logos, or create confusion.

### Design consequence for code
Because parts get stripped, the code can't HARD-assume files like `packages/pi-agent-server` exist. Every build script guards with `existsSync(...)`. When you extend, keep this discipline or OSS-sync breaks.

### Reference
- `LICENSE`, `NOTICE`, `TRADEMARK.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- `scripts/oss-sync.ts` (internal-only logic; in OSS repo as a stub).
- `scripts/electron-build-main.ts` — shows the `existsSync` guard pattern.
