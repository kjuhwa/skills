---
name: privacy-mode-trait-abstraction
description: Pluggable privacy-mode implementations: Windows MAG, exclude-from-capture, virtual-display drivers.
category: platform
version: 1.0.0
version_origin: extracted
tags: [abstraction, mode, platform, privacy, trait]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/privacy_mode.rs
imported_at: 2026-04-19T00:00:00Z
---

# Privacy Mode Trait Abstraction

## When to use
Pluggable privacy-mode implementations: Windows MAG, exclude-from-capture, virtual-display drivers.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/privacy_mode.rs`

## Why this generalizes
Reusable pattern where multiple mutually-exclusive OS strategies back one feature.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
