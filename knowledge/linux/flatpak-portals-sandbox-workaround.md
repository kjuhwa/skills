---
version: 0.1.0-draft
name: flatpak-portals-sandbox-workaround
type: knowledge
category: linux
summary: Flatpak uses XDG desktop portals for screen capture (screencast-portal) instead of direct X11/Wayland.
confidence: medium
tags: [flatpak, linux, platform, portals, sandbox, workaround]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/wayland/
imported_at: 2026-04-19T00:00:00Z
---

# Flatpak Portals Sandbox Workaround

## Fact
Flatpak uses XDG desktop portals for screen capture (screencast-portal) instead of direct X11/Wayland.

## Why it matters
Direct X11 capture is blocked in Flatpak; must go through the portal.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/wayland/`
