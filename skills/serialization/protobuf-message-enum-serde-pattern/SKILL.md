---
name: protobuf-message-enum-serde-pattern
description: Protobuf codegen with serde tag-based enum variants for FFI serialization.
category: serialization
version: 1.0.0
version_origin: extracted
tags: [enum, message, pattern, protobuf, serde, serialization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/flutter_ffi.rs
imported_at: 2026-04-19T00:00:00Z
---

# Protobuf Message Enum Serde Pattern

## When to use
Protobuf codegen with serde tag-based enum variants for FFI serialization.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/flutter_ffi.rs`

## Why this generalizes
Common shape for Rust↔JS/Dart message passing.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
