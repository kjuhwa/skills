---
name: lazy-static-global-state-registry
description: Thread-safe global state via lazy_static! Arc<Mutex<>> for per-peer decodings, event streams, textures.
category: patterns
version: 1.0.0
version_origin: extracted
tags: [global, lazy, patterns, registry, state, static]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [src/flutter.rs, src/server/video_service.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Lazy Static Global State Registry

## When to use
Thread-safe global state via lazy_static! Arc<Mutex<>> for per-peer decodings, event streams, textures.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/flutter.rs`, `src/server/video_service.rs`

## Why this generalizes
Widely applicable to Rust daemons with cross-task mutable registries.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
