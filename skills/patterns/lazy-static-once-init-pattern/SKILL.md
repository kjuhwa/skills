---
name: lazy-static-once-init-pattern
description: lazy_static! for one-time initialization of expensive resources (codec choices, audio devices).
category: patterns
version: 1.0.0
version_origin: extracted
tags: [init, lazy, once, pattern, patterns, static]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/video_service.rs
imported_at: 2026-04-19T00:00:00Z
---

# Lazy Static Once Init Pattern

## When to use
lazy_static! for one-time initialization of expensive resources (codec choices, audio devices).

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/server/video_service.rs`

## Why this generalizes
Common Rust one-shot init pattern.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
