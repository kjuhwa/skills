---
version: 0.1.0-draft
name: windows-imm32-keyboard-layout-caching
type: knowledge
category: input
summary: Cache keyboard layout via GetKeyboardLayout(); use MapVirtualKeyExW for VK↔scan mapping.
confidence: medium
tags: [caching, imm32, input, keyboard, layout, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/enigo/src/win/win_impl.rs
imported_at: 2026-04-19T00:00:00Z
---

# Windows Imm32 Keyboard Layout Caching

## Fact
Cache keyboard layout via GetKeyboardLayout(); use MapVirtualKeyExW for VK↔scan mapping.

## Why it matters
Querying layout every keystroke is slow — cache and invalidate on WM_INPUTLANGCHANGE.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/enigo/src/win/win_impl.rs`
