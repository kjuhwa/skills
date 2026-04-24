---
name: i18n-module-registry-pattern
description: Compile-time language module registration with lazy_static registry — no runtime file IO.
category: i18n
version: 1.0.0
version_origin: extracted
tags: [i18n, module, pattern, registry]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/lang.rs
imported_at: 2026-04-19T00:00:00Z
---

# I18n Module Registry Pattern

## When to use
Compile-time language module registration with lazy_static registry — no runtime file IO.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/lang.rs`

## Why this generalizes
Reusable for embedded/offline apps where JSON catalogs are too heavy.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
