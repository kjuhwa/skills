---
name: udp-kcp-stream-wrapper
description: KCP-over-UDP stream wrapper with tokio::select! for bi-directional packet routing.
category: networking
version: 1.0.0
version_origin: extracted
tags: [kcp, networking, stream, udp, wrapper]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/kcp_stream.rs
imported_at: 2026-04-19T00:00:00Z
---

# Udp Kcp Stream Wrapper

## When to use
KCP-over-UDP stream wrapper with tokio::select! for bi-directional packet routing.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/kcp_stream.rs`

## Why this generalizes
Reusable for low-latency WAN transport over lossy links.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
