---
version: 0.1.0-draft
name: release-auto-update-publish-url
summary: electron-updater pulls update manifests from https://agents.craft.do/electron/latest — a generic static URL provider, not GitHub Releases or S3 — so Craft Docs Ltd. controls rollout without electron-builder's built-in providers.
category: devops
tags: [electron-updater, auto-update, release, distribution]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/electron-builder.yml
imported_at: 2026-04-18T00:00:00Z
---

# Auto-update via generic static URL

### Setup
```yaml
# apps/electron/electron-builder.yml
publish:
  provider: generic
  url: https://agents.craft.do/electron/latest
```

electron-builder's `generic` provider means: drop the release manifests (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`) + binary files at a static URL. electron-updater polls that URL for version bumps.

### Why not GitHub Releases provider
- `https://agents.craft.do/electron/latest` is a controlled CDN Craft Docs Ltd. owns; GitHub Releases rate-limits unauthenticated users.
- Custom URL = custom gating logic (canary cohorts, A/B, region-specific rollouts) via the backend serving it.
- GitHub Releases ties updates to GitHub accounts visible to users; generic is anonymous.

### One URL, multi-platform
electron-builder generates:
- `latest-mac.yml` (ZIP + DMG, x64 + arm64)
- `latest.yml` (Windows NSIS)
- `latest-linux.yml` (AppImage)

Each manifest lists files + sha512 checksums. electron-updater downloads the binary from the same base URL.

### Rollback considerations
- Users auto-update as soon as the URL returns a higher version.
- To roll back, remove the offending `latest-*.yml` AND the new binary; electron-updater sees no update available and stays on current.
- There's no ability to force downgrade (electron-updater only advances).

### Per-channel (beta / stable)
Could have separate URLs (`/electron/beta/latest`, `/electron/stable/latest`), the app picks one based on a config toggle. The repo ships only "stable" URL.

### Signing
Auto-update on macOS/Windows requires signed binaries:
- macOS: `CSC_LINK`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (set in CI; disabled for local builds).
- Windows: signed NSIS installer.
- electron-updater verifies signature before applying the update.

### Reference
- `apps/electron/electron-builder.yml#publish`.
- `README.md` debug-mode sections reference log paths under `@craft-agent/electron/`.
