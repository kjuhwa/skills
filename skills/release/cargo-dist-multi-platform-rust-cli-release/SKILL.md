---
name: cargo-dist-multi-platform-rust-cli-release
description: Use cargo-dist to build, sign, and ship a Rust CLI as platform-specific binaries with shell + PowerShell installers and GitHub Attestations.
category: release
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, release]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Cargo Dist Multi Platform Rust Cli Release

**Trigger:** Releasing a Rust CLI that must be installable on Linux x86_64/aarch64, macOS aarch64, and Windows x64 with one-line installers.

## Steps

- Add dist-workspace.toml at repo root: workspace members, target triples, installer types (shell, powershell).
- Pin cargo-dist version (e.g. 0.31.0) and enable GitHub Attestations for build provenance.
- Set tag-namespace (e.g. 'cli') so the release workflow only fires for the right tags.
- Trigger workflow on tag push matching cli-v*.*.*; run dist plan, then dist build per target platform.
- Use ubuntu-24.04-arm for native aarch64; fall back to cross only when native runners aren't available.
- Generate shell + PowerShell installer scripts with checksums; publish to GitHub Releases with attestation metadata.

## Counter / Caveats

- Custom runners (aarch64) may not be in your GitHub plan; cross-compile via cross crate as fallback.
- Tag pattern in dist-workspace.toml is strict; mismatched tags silently skip the workflow.
- Installer scripts assume *nix conventions ($PATH, /usr/local/bin); restricted environments need manual install paths.
- Per-platform binaries can be 100MB+; GitHub Actions has a 5GB artifact cap.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `dist-workspace.toml:1-39`
- `.github/workflows/cli-release.yml:1-80`
