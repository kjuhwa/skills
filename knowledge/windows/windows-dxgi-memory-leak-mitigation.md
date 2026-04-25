---
version: 0.1.0-draft
name: windows-dxgi-memory-leak-mitigation
type: knowledge
category: windows
summary: DXGI AcquireNextFrame has a known memory-leak pattern — mitigate via rate-limited acquisition and explicit texture reuse.
confidence: high
tags: [dxgi, leak, memory, mitigation, platform, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/dxgi/mod.rs
imported_at: 2026-04-19T00:00:00Z
---

# Windows Dxgi Memory Leak Mitigation

## Fact
DXGI AcquireNextFrame has a known memory-leak pattern — mitigate via rate-limited acquisition and explicit texture reuse.

## Why it matters
Without the mitigation, long capture sessions OOM on Windows — especially on older GPU drivers.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/dxgi/mod.rs`
