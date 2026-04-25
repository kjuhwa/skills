---
version: 0.1.0-draft
name: session-timeout-constants
type: knowledge
category: networking
summary: CONNECT_TIMEOUT=10s, READ_TIMEOUT=30s, RELAY_PORT=21115, RENDEZVOUS_PORT=21116.
confidence: medium
tags: [constants, networking, session, timeout]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/common.rs
imported_at: 2026-04-19T00:00:00Z
---

# Session Timeout Constants

## Fact
CONNECT_TIMEOUT=10s, READ_TIMEOUT=30s, RELAY_PORT=21115, RENDEZVOUS_PORT=21116.

## Why it matters
Reasonable defaults for interactive remote-desktop traffic.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/common.rs`
