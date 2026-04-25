---
version: 0.1.0-draft
name: debug-vs-release-build-differences
type: knowledge
category: build-system
summary: Release: optimized codecs + LTO. Debug: flexi_logger on desktop, android_logger on Android.
confidence: medium
tags: [build, debug, differences, release, system]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [CLAUDE.md, src/flutter_ffi.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Debug Vs Release Build Differences

## Fact
Release: optimized codecs + LTO. Debug: flexi_logger on desktop, android_logger on Android.

## Why it matters
Know which logger is active in which profile; it changes log-format expectations.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `CLAUDE.md`
- `src/flutter_ffi.rs`
