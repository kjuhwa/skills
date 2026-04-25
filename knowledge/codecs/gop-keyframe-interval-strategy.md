---
version: 0.1.0-draft
name: gop-keyframe-interval-strategy
type: knowledge
category: codecs
summary: GOP defaults to MAX_GOP (~2-4s) for latency; per-peer config can override.
confidence: medium
tags: [codecs, gop, interval, keyframe, strategy]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [libs/scrap/src/common/hwcodec.rs, libs/scrap/src/common/vram.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Gop Keyframe Interval Strategy

## Fact
GOP defaults to MAX_GOP (~2-4s) for latency; per-peer config can override.

## Why it matters
Shorter GOP = better recovery from packet loss but higher bitrate; tune per network.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/common/hwcodec.rs`
- `libs/scrap/src/common/vram.rs`
