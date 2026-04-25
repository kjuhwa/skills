---
name: linux-desktop-manager-abstraction
description: Pluggable desktop-environment detection (GNOME/KDE/…) behind a platform::linux_desktop_manager module.
category: linux
version: 1.0.0
version_origin: extracted
tags: [abstraction, desktop, linux, manager, platform]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [src/platform/linux.rs, src/platform/linux_desktop_manager.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Linux Desktop Manager Abstraction

## When to use
Pluggable desktop-environment detection (GNOME/KDE/…) behind a platform::linux_desktop_manager module.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/platform/linux.rs`, `src/platform/linux_desktop_manager.rs`

## Why this generalizes
Reusable for any Linux desktop tool with DE-specific quirks.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
