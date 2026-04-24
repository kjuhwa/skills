---
name: bitrate-calculation-formula
type: knowledge
category: codecs
summary: base_bitrate = (width × height × fps × 0.07-0.1) / quality_factor; capped per codec.
confidence: medium
tags: [bitrate, calculation, codecs, formula]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/common/codec.rs
imported_at: 2026-04-19T00:00:00Z
---

# Bitrate Calculation Formula

## Fact
base_bitrate = (width × height × fps × 0.07-0.1) / quality_factor; capped per codec.

## Why it matters
Reasonable starting point for any real-time video quality controller.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/common/codec.rs`
