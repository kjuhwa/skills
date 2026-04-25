---
version: 0.1.0-draft
name: macos-notarization-and-signature-requirements
type: knowledge
category: macos
summary: macOS distribution requires code signing + notarization; helper scripts must be embedded (include_dir!) to stay inside the signed bundle.
confidence: high
tags: [and, macos, notarization, platform, requirements, signature]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/macos.rs
imported_at: 2026-04-19T00:00:00Z
---

# Macos Notarization And Signature Requirements

## Fact
macOS distribution requires code signing + notarization; helper scripts must be embedded (include_dir!) to stay inside the signed bundle.

## Why it matters
Unsigned helpers break Gatekeeper even if the main binary is signed.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/macos.rs`
