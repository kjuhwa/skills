---
version: 0.1.0-draft
name: feature-flag-rust-unwrap-policy
type: knowledge
category: rust-rules
summary: Policy: no unwrap()/expect() except in tests (readability) and lock acquisition (poison only).
confidence: medium
tags: [feature, flag, policy, rules, rust, unwrap]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: CLAUDE.md
imported_at: 2026-04-19T00:00:00Z
---

# Feature Flag Rust Unwrap Policy

## Fact
Policy: no unwrap()/expect() except in tests (readability) and lock acquisition (poison only).

## Why it matters
Codified policy avoids silent panics in async tasks.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `CLAUDE.md`
