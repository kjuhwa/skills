---
name: keycode-mapping-multi-platform
description: Platform-specific keycode translation (Windows VK↔scan code, macOS CGKeyCode↔RdevKey) with layout awareness.
category: input
version: 1.0.0
version_origin: extracted
tags: [input, keycode, mapping, multi, platform]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [src/keyboard.rs, libs/enigo/src/win/keycodes.rs, libs/enigo/src/macos/keycodes.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Keycode Mapping Multi Platform

## When to use
Platform-specific keycode translation (Windows VK↔scan code, macOS CGKeyCode↔RdevKey) with layout awareness.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/keyboard.rs`, `libs/enigo/src/win/keycodes.rs`, `libs/enigo/src/macos/keycodes.rs`

## Why this generalizes
Any input-synthesis tool hits this mapping problem.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
