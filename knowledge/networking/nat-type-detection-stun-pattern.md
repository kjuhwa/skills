---
version: 0.1.0-draft
name: nat-type-detection-stun-pattern
type: knowledge
category: networking
summary: NAT type detected via stunclient; drives relay-vs-direct decision at session setup.
confidence: medium
tags: [detection, nat, networking, pattern, stun, type]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/common.rs
imported_at: 2026-04-19T00:00:00Z
---

# Nat Type Detection Stun Pattern

## Fact
NAT type detected via stunclient; drives relay-vs-direct decision at session setup.

## Why it matters
Detect once at connect and cache; don't re-probe per session.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/common.rs`
