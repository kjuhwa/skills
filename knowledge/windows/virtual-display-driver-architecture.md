---
version: 0.1.0-draft
name: virtual-display-driver-architecture
type: knowledge
category: windows
summary: Virtual-display driver ships a separate dylib; host process does dynamic symbol loading and monitor hotplug emulation.
confidence: high
tags: [architecture, display, driver, platform, virtual, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/virtual_display/src/lib.rs
imported_at: 2026-04-19T00:00:00Z
---

# Virtual Display Driver Architecture

## Fact
Virtual-display driver ships a separate dylib; host process does dynamic symbol loading and monitor hotplug emulation.

## Why it matters
Keeps driver signing isolated from the main binary, simplifies updates, and allows optional install.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/virtual_display/src/lib.rs`
