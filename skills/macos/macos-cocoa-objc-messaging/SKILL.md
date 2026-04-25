---
name: macos-cocoa-objc-messaging
description: objc message-based API calls for macOS (NSApp, NSApplication, CGEvent) via cocoa crate.
category: macos
version: 1.0.0
version_origin: extracted
tags: [cocoa, macos, messaging, objc, platform]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/macos.rs
imported_at: 2026-04-19T00:00:00Z
---

# Macos Cocoa Objc Messaging

## When to use
objc message-based API calls for macOS (NSApp, NSApplication, CGEvent) via cocoa crate.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/platform/macos.rs`

## Why this generalizes
Canonical Rust↔ObjC bridge pattern.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
