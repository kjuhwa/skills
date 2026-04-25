---
version: 0.1.0-draft
name: linux-desktop-manager-detection-heuristics
type: knowledge
category: linux
summary: DE detection: check $XDG_CURRENT_DESKTOP, parse .desktop files, fallback to sysinfo.
confidence: medium
tags: [desktop, detection, heuristics, linux, manager, platform]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/linux_desktop_manager.rs
imported_at: 2026-04-19T00:00:00Z
---

# Linux Desktop Manager Detection Heuristics

## Fact
DE detection: check $XDG_CURRENT_DESKTOP, parse .desktop files, fallback to sysinfo.

## Why it matters
No single source of truth on Linux; layered heuristic is required.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/linux_desktop_manager.rs`
