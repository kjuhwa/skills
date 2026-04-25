---
version: 0.1.0-draft
name: cross-platform-codec-initialization-order
type: knowledge
category: codecs
summary: Codec precedence at runtime: hwcodec > vram > software, chosen by probing device capability and user config.
confidence: high
tags: [codec, codecs, cross, initialization, order, platform]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/common/codec.rs
imported_at: 2026-04-19T00:00:00Z
---

# Cross Platform Codec Initialization Order

## Fact
Codec precedence at runtime: hwcodec > vram > software, chosen by probing device capability and user config.

## Why it matters
Always probe during startup, not per-frame — probing is expensive and triggers driver loads.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/common/codec.rs`
