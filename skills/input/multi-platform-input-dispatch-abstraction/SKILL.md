---
name: multi-platform-input-dispatch-abstraction
description: Unified keyboard/mouse input via Windows SendInput, macOS CGEvent, Linux xdo/uinput under one trait.
category: input
version: 1.0.0
version_origin: extracted
tags: [abstraction, dispatch, input, multi, platform]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [libs/enigo/src/win/, libs/enigo/src/macos/, libs/enigo/src/linux/]
imported_at: 2026-04-19T00:00:00Z
---

# Multi Platform Input Dispatch Abstraction

## When to use
Unified keyboard/mouse input via Windows SendInput, macOS CGEvent, Linux xdo/uinput under one trait.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `libs/enigo/src/win/`, `libs/enigo/src/macos/`, `libs/enigo/src/linux/`

## Why this generalizes
Any cross-platform input-injection library faces the same divergence.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
