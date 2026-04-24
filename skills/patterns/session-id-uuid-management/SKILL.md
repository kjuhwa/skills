---
name: session-id-uuid-management
description: UUID-typed SessionID with RwLock<HashMap<SessionID, Session>> for multi-window tracking.
category: patterns
version: 1.0.0
version_origin: extracted
tags: [management, patterns, session, uuid]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/flutter_ffi.rs
imported_at: 2026-04-19T00:00:00Z
---

# Session Id Uuid Management

## When to use
UUID-typed SessionID with RwLock<HashMap<SessionID, Session>> for multi-window tracking.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/flutter_ffi.rs`

## Why this generalizes
Reusable for multi-session desktop apps.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
