---
version: 0.1.0-draft
name: wayland-xwayland-compatibility-quirks
type: knowledge
category: linux
summary: Use hbb_common::platform::linux::is_x11_or_headless() to branch between X11 and Wayland paths; headless server needs its own fallback.
confidence: high
tags: [compatibility, linux, platform, quirks, wayland, xwayland]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/linux.rs
imported_at: 2026-04-19T00:00:00Z
---

# Wayland Xwayland Compatibility Quirks

## Fact
Use hbb_common::platform::linux::is_x11_or_headless() to branch between X11 and Wayland paths; headless server needs its own fallback.

## Why it matters
XWayland is not equivalent to native X11 — input and capture behave subtly differently.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/linux.rs`
