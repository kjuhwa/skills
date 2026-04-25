---
version: 0.1.0-draft
name: macos-ax-trusted-check-prompt
type: knowledge
category: macos
summary: macOS accessibility check: use kAXTrustedCheckOptionPrompt to auto-prompt the user for consent.
confidence: medium
tags: [check, macos, platform, prompt, trusted]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/macos.rs
imported_at: 2026-04-19T00:00:00Z
---

# Macos Ax Trusted Check Prompt

## Fact
macOS accessibility check: use kAXTrustedCheckOptionPrompt to auto-prompt the user for consent.

## Why it matters
Silent checks fail; prompt-flag check is the canonical pattern.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/macos.rs`
