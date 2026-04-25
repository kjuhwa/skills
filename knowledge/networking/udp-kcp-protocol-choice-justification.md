---
version: 0.1.0-draft
name: udp-kcp-protocol-choice-justification
type: knowledge
category: networking
summary: KCP-over-UDP is preferred for WAN: better than pure TCP on lossy/high-latency links; faster RPC than QUIC in this app's domain.
confidence: high
tags: [choice, justification, kcp, networking, protocol, udp]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/kcp_stream.rs
imported_at: 2026-04-19T00:00:00Z
---

# Udp Kcp Protocol Choice Justification

## Fact
KCP-over-UDP is preferred for WAN: better than pure TCP on lossy/high-latency links; faster RPC than QUIC in this app's domain.

## Why it matters
Don't reach for QUIC by default — KCP is simpler and often faster for small-message control channels.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/kcp_stream.rs`
