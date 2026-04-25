---
version: 0.1.0-draft
name: vcpkg-dependency-management
type: knowledge
category: build-system
summary: C++ deps (libvpx, libyuv, opus, aom) via vcpkg; set VCPKG_ROOT; custom Sciter library download.
confidence: high
tags: [build, dependency, management, system, vcpkg]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: CLAUDE.md
imported_at: 2026-04-19T00:00:00Z
---

# Vcpkg Dependency Management

## Fact
C++ deps (libvpx, libyuv, opus, aom) via vcpkg; set VCPKG_ROOT; custom Sciter library download.

## Why it matters
Cargo-only builds fail without vcpkg bootstrap — document clearly in setup.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `CLAUDE.md`
