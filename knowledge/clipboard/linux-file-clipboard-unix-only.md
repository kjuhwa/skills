---
version: 0.1.0-draft
name: linux-file-clipboard-unix-only
type: knowledge
category: clipboard
summary: Unix file copy-paste requires X11Clipboard + a local file server; not reachable on Windows by default.
confidence: high
tags: [clipboard, file, linux, only, unix]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/clipboard/src/lib.rs
imported_at: 2026-04-19T00:00:00Z
---

# Linux File Clipboard Unix Only

## Fact
Unix file copy-paste requires X11Clipboard + a local file server; not reachable on Windows by default.

## Why it matters
Feature-gate behind unix-file-copy-paste; plan UX fallback for Windows.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/clipboard/src/lib.rs`
