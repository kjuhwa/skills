---
version: 0.1.0-draft
name: esm-only-pi-sdk-build-constraint
summary: The Pi SDK (@mariozechner/pi-coding-agent) is ESM-only; bundling it with esbuild packages:external leaves require() calls that fail at runtime — the fix is bun build --target=bun --format=esm.
category: pitfall
tags: [esm, cjs, bundler, pi-sdk, bun-build]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: scripts/electron-build-main.ts
imported_at: 2026-04-18T00:00:00Z
---

# Bundling the ESM-only Pi SDK — a real pitfall

### Problem
The Pi SDK family (`@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-agent-core`) is published as **ESM-only**. Standard esbuild-with-packages-external config produces a CJS output where those ESM deps are preserved as `require()` calls. At runtime, Node/Bun hit `require() of ES modules is not supported` and crash.

### The failed path
```ts
// This LOOKS right but FAILS at runtime:
esbuild.build({
  entryPoints: ['packages/pi-agent-server/src/index.ts'],
  bundle: true, platform: 'node', format: 'cjs',
  packages: 'external',   // <-- leaves `require("@mariozechner/pi-ai")` in output
});
```

### The working path
```ts
// From scripts/electron-build-main.ts and scripts/electron-dev.ts:
Bun.spawn(['bun', 'build', 'src/index.ts',
  '--outdir=dist',
  '--target=bun',   // Pi SDK uses Bun-specific APIs via koffi
  '--format=esm',   // ESM in -> ESM out, no require() on ESM deps
  '--external=koffi',  // koffi is native; don't try to bundle
], { cwd: PI_AGENT_SERVER_DIR });
```

Two critical choices:
- `--target=bun` because the Pi SDK uses Bun's `ffi` via koffi transitively.
- `--format=esm` so ESM imports stay ESM imports.
- `--external koffi` because koffi is a native `.node` addon; bundling it embeds invalid binary content.

### Why this matters for other projects
- ESM-only deps are increasing (2025+). `packages:external` with CJS output is a common trap.
- `bun build` handles ESM→ESM bundling cleanly where esbuild with strict provider settings struggles.
- Optional subprocess builds (the repo skips Pi if `packages/pi-agent-server/src` is missing) let an OSS fork that doesn't include Pi skip the bundle entirely.

### Symptoms if you get it wrong
- Build succeeds.
- App starts.
- User selects a Pi provider (Google, ChatGPT Plus, GitHub Copilot).
- Subprocess spawns, immediately exits with: `Error [ERR_REQUIRE_ESM]: require() of ES Module @mariozechner/pi-ai ... from pi-agent-server/dist/index.js not supported.`
- No helpful error in the UI.

### Reference
- `scripts/electron-build-main.ts#buildPiAgentServer`
- `scripts/electron-dev.ts#buildPiAgentServer`
- `packages/pi-agent-server/package.json`
