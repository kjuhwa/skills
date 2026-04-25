---
version: 0.1.0-draft
name: lazy-static-initialization-cost
type: knowledge
category: patterns
summary: lazy_static! incurs runtime cost on first access; used for codec selection and device enumeration.
confidence: medium
tags: [cost, initialization, lazy, patterns, static]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/video_service.rs
imported_at: 2026-04-19T00:00:00Z
---

# Lazy Static Initialization Cost

## Fact
lazy_static! incurs runtime cost on first access; used for codec selection and device enumeration.

## Why it matters
Prefer once_cell::sync::OnceCell for new code; lazy_static is legacy.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/server/video_service.rs`
