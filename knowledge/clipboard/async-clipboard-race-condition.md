---
version: 0.1.0-draft
name: async-clipboard-race-condition
type: knowledge
category: clipboard
summary: Clipboard access retries (3x at 33ms intervals) to handle concurrent-access conflicts on Windows.
confidence: medium
tags: [async, clipboard, condition, race]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/clipboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Async Clipboard Race Condition

## Fact
Clipboard access retries (3x at 33ms intervals) to handle concurrent-access conflicts on Windows.

## Why it matters
Windows OpenClipboard fails often under contention — always retry briefly.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/clipboard.rs`
