---
version: 0.1.0-draft
name: android-ios-feature-parity-gap
type: knowledge
category: mobile
summary: Android: full codecs + input; iOS: limited input, screen share only, no clipboard file transfer (due to iOS entitlements).
confidence: high
tags: [android, feature, gap, ios, mobile, parity]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/flutter_ffi.rs
imported_at: 2026-04-19T00:00:00Z
---

# Android Ios Feature Parity Gap

## Fact
Android: full codecs + input; iOS: limited input, screen share only, no clipboard file transfer (due to iOS entitlements).

## Why it matters
Don't design a feature assuming iOS/Android parity — APIs diverge significantly.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/flutter_ffi.rs`
