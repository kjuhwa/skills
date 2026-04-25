---
name: wayland-pipewire-portal-abstraction
description: Wayland desktop-portal protocol for screen capture via screencast_portal and request_portal.
category: linux
version: 1.0.0
version_origin: extracted
tags: [abstraction, linux, pipewire, platform, portal, wayland]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/wayland/
imported_at: 2026-04-19T00:00:00Z
---

# Wayland Pipewire Portal Abstraction

## When to use
Wayland desktop-portal protocol for screen capture via screencast_portal and request_portal.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `libs/scrap/src/wayland/`

## Why this generalizes
Required pattern for any Wayland-aware capture tool.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
