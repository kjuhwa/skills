---
name: port-forwarding-tunnel-multiplexer
description: TCP tunnel multiplexing for port forwarding with Framed codec and login handshake.
category: networking
version: 1.0.0
version_origin: extracted
tags: [forwarding, multiplexer, networking, port, tunnel]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/port_forward.rs
imported_at: 2026-04-19T00:00:00Z
---

# Port Forwarding Tunnel Multiplexer

## When to use
TCP tunnel multiplexing for port forwarding with Framed codec and login handshake.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/port_forward.rs`

## Why this generalizes
Reusable for SSH-style tunnel builders.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
