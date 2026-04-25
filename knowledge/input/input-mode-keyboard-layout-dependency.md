---
version: 0.1.0-draft
name: input-mode-keyboard-layout-dependency
type: knowledge
category: input
summary: Two input modes: Unicode (layout-independent) vs Layout (layout-dependent; needed for modifiers).
confidence: high
tags: [dependency, input, keyboard, layout, mode]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/keyboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Input Mode Keyboard Layout Dependency

## Fact
Two input modes: Unicode (layout-independent) vs Layout (layout-dependent; needed for modifiers).

## Why it matters
Unicode mode breaks Ctrl/Alt combos in some apps — keep both and let the user choose per session.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/keyboard.rs`
