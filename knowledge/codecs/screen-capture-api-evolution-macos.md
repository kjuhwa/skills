---
version: 0.1.0-draft
name: screen-capture-api-evolution-macos
type: knowledge
category: codecs
summary: macOS capture has shifted: legacy Quartz CGDisplayCreateImage → ScreenCaptureKit (Monterey+) behind a feature flag.
confidence: high
tags: [api, capture, codecs, evolution, macos, screen]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/quartz/
imported_at: 2026-04-19T00:00:00Z
---

# Screen Capture Api Evolution Macos

## Fact
macOS capture has shifted: legacy Quartz CGDisplayCreateImage → ScreenCaptureKit (Monterey+) behind a feature flag.

## Why it matters
Plan for dual-code-path during the OS-version transition window; Apple deprecates old APIs aggressively.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/quartz/`
