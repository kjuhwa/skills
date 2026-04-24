---
name: connection-type-enum-design
type: knowledge
category: networking
summary: ConnType enum: RDP (over relay), Direct TCP, Direct UDP, LAN discovery — drives fallback logic.
confidence: medium
tags: [connection, design, enum, networking, type]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/common.rs
imported_at: 2026-04-19T00:00:00Z
---

# Connection Type Enum Design

## Fact
ConnType enum: RDP (over relay), Direct TCP, Direct UDP, LAN discovery — drives fallback logic.

## Why it matters
Explicit enum beats boolean flags for multi-mode connection logic.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/common.rs`
