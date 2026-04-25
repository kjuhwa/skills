---
version: 0.1.0-draft
name: privacy-mode-implementation-choices
type: knowledge
category: windows
summary: Three privacy-mode strategies coexist: MAG (fast but limited), exclude-from-capture (Win10 2004+), virtual-display (fullscreen gaming).
confidence: high
tags: [choices, implementation, mode, platform, privacy, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/privacy_mode.rs
imported_at: 2026-04-19T00:00:00Z
---

# Privacy Mode Implementation Choices

## Fact
Three privacy-mode strategies coexist: MAG (fast but limited), exclude-from-capture (Win10 2004+), virtual-display (fullscreen gaming).

## Why it matters
Each has different compatibility + UX trade-offs — choose per use case, not one globally.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/privacy_mode.rs`
