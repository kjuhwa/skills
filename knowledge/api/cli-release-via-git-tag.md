---
version: 0.1.0-draft
name: cli-release-via-git-tag
summary: CLI releases are cut from semver tags on main — push a tag, GitHub Actions runs tests, GoReleaser builds multi-platform binaries and updates the Homebrew tap.
category: api
tags: [release, cli, git-tag, goreleaser, github-actions]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Release flow is two commands:

```bash
git tag v0.1.13
git push origin v0.1.13
```

The tag push triggers `release.yml`: run Go tests → GoReleaser builds multi-platform binaries → publishes to GitHub Releases + updates Homebrew tap.

Bump the patch version each release by default (`v0.1.12` → `v0.1.13`) unless the user specifies a specific version. A CLI release must accompany every production deployment.

## Why

Tag-triggered releases keep release history auditable (one tag = one release) and make rollback obvious (just delete the tag and re-tag). GoReleaser handles the cross-platform binary production and the Homebrew formula update automatically; manual formula edits are error-prone. Coupling CLI release to production deploy means server-CLI protocol changes never ship skewed.

## Evidence

- CLAUDE.md, "CLI Release" section.
- `.github/workflows/release.yml` (referenced).
