---
version: 0.1.0-draft
name: display-enumeration-winapi-structs
type: knowledge
category: windows
summary: DisplayInfo protobuf encodes width, height, HiDPI scaling, monitor index mapping.
confidence: medium
tags: [display, enumeration, platform, structs, winapi, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/windows.rs
imported_at: 2026-04-19T00:00:00Z
---

# Display Enumeration Winapi Structs

## Fact
DisplayInfo protobuf encodes width, height, HiDPI scaling, monitor index mapping.

## Why it matters
Shape of the wire message that everyone else consumes — keep it stable.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/windows.rs`
