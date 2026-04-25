---
version: 0.1.0-draft
name: clipboard-ownership-protocol
type: knowledge
category: clipboard
summary: Clipboard-ownership detection uses a custom format flag (dyn.com.rustdesk.owner) to prevent copy-paste loops between host and guest.
confidence: high
tags: [clipboard, ownership, protocol]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/clipboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Clipboard Ownership Protocol

## Fact
Clipboard-ownership detection uses a custom format flag (dyn.com.rustdesk.owner) to prevent copy-paste loops between host and guest.

## Why it matters
Any clipboard-sync tool must own a sentinel format, or two instances will echo content forever.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/clipboard.rs`
