---
version: 0.1.0-draft
name: transparent-window-class-flutter
type: knowledge
category: flutter
summary: Flutter window class FLUTTER_RUNNER_WIN32_WINDOW needs special handling for taskbar / install flows.
confidence: medium
tags: [class, flutter, transparent, window]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/windows.rs
imported_at: 2026-04-19T00:00:00Z
---

# Transparent Window Class Flutter

## Fact
Flutter window class FLUTTER_RUNNER_WIN32_WINDOW needs special handling for taskbar / install flows.

## Why it matters
Pin the class name for WM_* message routing and installer detection.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/windows.rs`
