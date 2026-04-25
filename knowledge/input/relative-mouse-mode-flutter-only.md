---
version: 0.1.0-draft
name: relative-mouse-mode-flutter-only
type: knowledge
category: input
summary: Relative mouse (delta-based) mode is Flutter-UI-only; legacy Sciter can't deliver pointer-lock events.
confidence: high
tags: [flutter, input, mode, mouse, only, relative]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/keyboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Relative Mouse Mode Flutter Only

## Fact
Relative mouse (delta-based) mode is Flutter-UI-only; legacy Sciter can't deliver pointer-lock events.

## Why it matters
Don't promise the feature to Sciter users; gate by UI framework.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/keyboard.rs`
