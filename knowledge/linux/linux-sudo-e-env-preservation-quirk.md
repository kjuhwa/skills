---
version: 0.1.0-draft
name: linux-sudo-e-env-preservation-quirk
type: knowledge
category: linux
summary: Ubuntu 25.10+ changed sudo -E behavior so it no longer preserves env cleanly; probe via sentinel env var.
confidence: high
tags: [env, linux, platform, preservation, quirk, sudo]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/linux.rs
imported_at: 2026-04-19T00:00:00Z
---

# Linux Sudo E Env Preservation Quirk

## Fact
Ubuntu 25.10+ changed sudo -E behavior so it no longer preserves env cleanly; probe via sentinel env var.

## Why it matters
Any Rust tool relying on sudo -E $VAR needs a runtime probe to detect this regression.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/linux.rs`
