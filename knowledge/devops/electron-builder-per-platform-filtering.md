---
version: 0.1.0-draft
name: electron-builder-per-platform-filtering
summary: electron-builder.yml uses per-platform extraResources + files: exclusions to ship only the target's Bun/Codex/Copilot binaries and the matching ripgrep vendor — trimming installer size by 60-80%.
category: devops
tags: [electron-builder, packaging, per-platform, installer-size]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/electron-builder.yml
imported_at: 2026-04-18T00:00:00Z
---

# electron-builder per-platform filtering

`apps/electron/electron-builder.yml` encodes several per-platform tricks for shipping a minimal installer.

### Per-platform `extraResources`
Each of `mac:`, `win:`, `linux:` has an `extraResources` block that copies in:
- `node_modules/@anthropic-ai/claude-agent-sdk` with `filter` excluding the OTHER platforms' `vendor/ripgrep/` subdirs. The SDK ships ripgrep binaries for every platform; filtering drops 30-40MB per installer.
- Platform-specific `vendor/codex/` and `vendor/copilot/` dirs.
- Platform-specific `resources/bin/<platform>-<arch>/` with the uv binary.

### `files:` exclusions
Each platform also has a `files:` block with negative glob patterns to exclude other platforms' binaries from the main `dist/` bundle:
```yaml
files:
  - "!**/vendor/codex/linux-*/**"
  - "!**/vendor/codex/win32-*/**"
  ...
```

### Windows `EBUSY` workaround
`electron-builder`'s npm node-module collector is buggy on Windows with `.exe` files (bug #8250): scanning and copying in parallel causes `EBUSY`. Workaround:
- Exclude `vendor/bun`, `vendor/codex`, `vendor/copilot`, `resources/bin/win32-x64` from `files:`.
- Re-add them as `extraResources` so they're copied before the collector sees them.

### macOS afterPack hook
`afterPack: scripts/afterPack.cjs` runs after packaging to install a pre-compiled `Assets.car` (macOS 26+ Liquid Glass icon). Must be pre-compiled with `xcrun actool` locally on macOS 26 — CI doesn't have the SDK.

### NSIS (Windows) choices
```yaml
nsis:
  oneClick: true
  perMachine: false   # per-user install to %LOCALAPPDATA%\Programs\
  deleteAppDataOnUninstall: true
```
Per-user because: Bun subprocess cannot read/write in `Program Files` due to Windows permissions — you'd get silent failures in the agent's Bash tool.

### Custom DMG
Multi-resolution TIFF background (`resources/dmg-background.tiff`), custom layout for Applications drop target. Uses `artifactName: "Craft-Agents-${arch}.dmg"` so outputs are predictable per arch.

### Disabled ASAR
`asar: false` — intentional. Decompression on every file open causes click-delay. Installer is larger; launch latency is better.

### Why this matters for others
If you ship multi-platform Electron with per-platform native binaries, this is a working example of fine-grained filtering that dramatically reduces per-arch installer size. Adapt the vendor/ripgrep exclusion pattern to any cross-platform native dep you bundle.
