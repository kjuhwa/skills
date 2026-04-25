---
version: 0.1.0-draft
name: text-rendering-font-fallback
type: knowledge
category: flutter
summary: Flutter text rendering falls back: system defaults + bundled Google Fonts for CJK coverage.
confidence: medium
tags: [fallback, flutter, font, rendering, text]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: flutter/lib/common/
imported_at: 2026-04-19T00:00:00Z
---

# Text Rendering Font Fallback

## Fact
Flutter text rendering falls back: system defaults + bundled Google Fonts for CJK coverage.

## Why it matters
Without bundled fonts, Chinese/Japanese text renders as tofu on stripped Linux containers.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `flutter/lib/common/`
