---
version: 0.1.0-draft
name: windows-service-elevation-patterns
type: knowledge
category: windows
summary: Service elevation via OpenProcessToken + TokenElevation; runs as SYSTEM or user via securitybaseapi.
confidence: high
tags: [elevation, patterns, platform, service, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/windows.rs
imported_at: 2026-04-19T00:00:00Z
---

# Windows Service Elevation Patterns

## Fact
Service elevation via OpenProcessToken + TokenElevation; runs as SYSTEM or user via securitybaseapi.

## Why it matters
Standard UAC-safe pattern for a Rust Windows service.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/windows.rs`
