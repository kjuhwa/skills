---
version: 0.1.0-draft
name: permission-system-design-peer-config
type: knowledge
category: auth
summary: Permissions stored per-peer in Config::get_peer_option(); not global; sync'd via the rendezvous server.
confidence: high
tags: [auth, config, design, peer, permission, system]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/connection.rs
imported_at: 2026-04-19T00:00:00Z
---

# Permission System Design Peer Config

## Fact
Permissions stored per-peer in Config::get_peer_option(); not global; sync'd via the rendezvous server.

## Why it matters
Avoid global permission tables — they conflict with multi-user workflows.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/server/connection.rs`
