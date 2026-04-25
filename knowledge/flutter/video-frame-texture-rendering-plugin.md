---
version: 0.1.0-draft
name: video-frame-texture-rendering-plugin
type: knowledge
category: flutter
summary: Windows/Linux/macOS load DLL-based texture-renderer plugins at runtime for GPU rendering.
confidence: medium
tags: [flutter, frame, plugin, rendering, texture, video]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/flutter.rs
imported_at: 2026-04-19T00:00:00Z
---

# Video Frame Texture Rendering Plugin

## Fact
Windows/Linux/macOS load DLL-based texture-renderer plugins at runtime for GPU rendering.

## Why it matters
Keeps platform GPU code out of the Dart binary and allows post-ship plugin updates.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/flutter.rs`
