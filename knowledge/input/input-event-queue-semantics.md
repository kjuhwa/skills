---
version: 0.1.0-draft
name: input-event-queue-semantics
type: knowledge
category: input
summary: Input processing: queue events, batch per frame, avoid stale state during handoff.
confidence: medium
tags: [event, input, queue, semantics]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/input_service.rs
imported_at: 2026-04-19T00:00:00Z
---

# Input Event Queue Semantics

## Fact
Input processing: queue events, batch per frame, avoid stale state during handoff.

## Why it matters
Per-event immediate apply causes drops under load; batching smooths it.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/server/input_service.rs`
