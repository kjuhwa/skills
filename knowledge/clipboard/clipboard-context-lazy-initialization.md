---
version: 0.1.0-draft
name: clipboard-context-lazy-initialization
type: knowledge
category: clipboard
summary: Clipboard context is lazy-init on first check_clipboard(); one context per side.
confidence: medium
tags: [clipboard, context, initialization, lazy]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/clipboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Clipboard Context Lazy Initialization

## Fact
Clipboard context is lazy-init on first check_clipboard(); one context per side.

## Why it matters
Avoid creating the context during app startup — it grabs OS locks.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/clipboard.rs`
