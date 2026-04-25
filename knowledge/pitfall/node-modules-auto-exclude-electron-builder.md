---
version: 0.1.0-draft
name: node-modules-auto-exclude-electron-builder
summary: electron-builder v20.15.2+ auto-excludes directories named "node_modules" from the package — work around with explicit extraResources from/to paths to ship your SDK.
category: pitfall
tags: [electron-builder, node_modules, packaging]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/electron-builder.yml
imported_at: 2026-04-18T00:00:00Z
---

# electron-builder silently strips `node_modules`

### The footgun
Since electron-builder v20.15.2, directories named `node_modules` are automatically excluded from packaging EVEN if you try to include them via the `files:` glob. Reported upstream at electron-builder#3104, not fixed — considered "intentional".

If your app packages a SDK (or any library you've pre-bundled) from `node_modules/@somebody/foo`, it silently won't ship. Symptoms: packaged app crashes at runtime with `Cannot find module '@somebody/foo'`. Dev build works fine.

### The workaround
Use `extraResources` with explicit `from` / `to` pairs — this path bypasses the `node_modules` auto-exclusion:

```yaml
# apps/electron/electron-builder.yml
mac:
  extraResources:
    - from: node_modules/@anthropic-ai/claude-agent-sdk
      to: app/node_modules/@anthropic-ai/claude-agent-sdk
      filter:
        - "**/*"
        - "!vendor/ripgrep/arm64-linux/**"
        - "!vendor/ripgrep/x64-linux/**"
        - "!vendor/ripgrep/x64-win32/**"
```

Note the `filter:` subfield lets you do per-platform strip of unwanted binaries INSIDE the extraResource.

### Implications
- Anything your app imports at runtime that's pulled via a normal `require` from `node_modules/` must be in `extraResources`, not rely on `files:`.
- Works best if you keep a small explicit list of deps (SDKs with native binaries). Trying to extraResource ALL of `node_modules` defeats the purpose.
- Pre-bundling via esbuild + `--bundle` (inlines everything) is an alternative: then you don't need node_modules at runtime. The craft-agents repo uses that for `main.cjs` and the interceptor. It still uses extraResources for the SDK because the SDK internally spawns subprocesses that resolve to its `vendor/ripgrep`.

### Symptoms if you miss it
- `electron-builder` succeeds with no warnings.
- `pnpm dist` / `bun run electron:dist` produces an app.
- Running the packaged app, first SDK call: `Error: Cannot find module '@anthropic-ai/claude-agent-sdk'`.
- Debugging "it works in dev" wastes hours.

### Reference
- `apps/electron/electron-builder.yml` (every platform has the same extraResources block).
- Upstream: https://github.com/electron-userland/electron-builder/issues/3104
