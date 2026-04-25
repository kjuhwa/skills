---
version: 0.1.0-draft
name: display-orientation-rotation-handling
type: knowledge
category: codecs
summary: Cache RotationMode per display and apply during capture (DXGI, Quartz, X11) — don't re-probe per frame.
confidence: medium
tags: [codecs, display, handling, orientation, rotation]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/common/convert.rs
imported_at: 2026-04-19T00:00:00Z
---

# Display Orientation Rotation Handling

## Fact
Cache RotationMode per display and apply during capture (DXGI, Quartz, X11) — don't re-probe per frame.

## Why it matters
Re-probing per frame degrades FPS; invalidate cache only on display-change events.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/common/convert.rs`
