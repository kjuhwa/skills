---
name: ipc-message-framing-codec
description: Tokio-based IPC using parity-tokio-ipc with protobuf message framing and FileSystem command enum.
category: ipc
version: 1.0.0
version_origin: extracted
tags: [codec, framing, ipc, message]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/ipc.rs
imported_at: 2026-04-19T00:00:00Z
---

# Ipc Message Framing Codec

## When to use
Tokio-based IPC using parity-tokio-ipc with protobuf message framing and FileSystem command enum.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/ipc.rs`

## Why this generalizes
Reusable pattern for local daemon ↔ UI IPC.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
