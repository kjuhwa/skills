---
version: 0.1.0-draft
name: gdi-fallback-screen-capture
type: knowledge
category: codecs
summary: On Windows, try DXGI first; fall back to GDI for legacy/virtual displays that DXGI can't enumerate.
confidence: medium
tags: [capture, codecs, fallback, gdi, screen]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/dxgi/mod.rs
imported_at: 2026-04-19T00:00:00Z
---

# Gdi Fallback Screen Capture

## Fact
On Windows, try DXGI first; fall back to GDI for legacy/virtual displays that DXGI can't enumerate.

## Why it matters
Virtual displays and RDP sessions often force the GDI path.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/dxgi/mod.rs`
