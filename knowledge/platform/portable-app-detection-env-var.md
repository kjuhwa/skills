---
version: 0.1.0-draft
name: portable-app-detection-env-var
type: knowledge
category: platform
summary: Portable mode detection: check RUSTDESK_APPNAME env var; changes temp dir and config paths.
confidence: medium
tags: [app, detection, env, platform, portable, var]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/common.rs
imported_at: 2026-04-19T00:00:00Z
---

# Portable App Detection Env Var

## Fact
Portable mode detection: check RUSTDESK_APPNAME env var; changes temp dir and config paths.

## Why it matters
Env-var switch is cleaner than a sidecar file marker.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/common.rs`
