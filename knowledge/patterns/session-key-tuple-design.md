---
version: 0.1.0-draft
name: session-key-tuple-design
type: knowledge
category: patterns
summary: SessionKey uses (peer_id, conn_id) tuple to isolate concurrent sessions to the same peer.
confidence: medium
tags: [design, key, patterns, session, tuple]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/connection.rs
imported_at: 2026-04-19T00:00:00Z
---

# Session Key Tuple Design

## Fact
SessionKey uses (peer_id, conn_id) tuple to isolate concurrent sessions to the same peer.

## Why it matters
Necessary to support multiple windows from the same operator to the same machine.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/server/connection.rs`
