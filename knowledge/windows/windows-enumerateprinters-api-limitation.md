---
version: 0.1.0-draft
name: windows-enumerateprinters-api-limitation
type: knowledge
category: windows
summary: EnumPrintersW filters by PRINTER_ENUM_LOCAL/CONNECTIONS; doesn't discover remote-only printers.
confidence: medium
tags: [api, enumerateprinters, limitation, platform, windows]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/windows.rs
imported_at: 2026-04-19T00:00:00Z
---

# Windows Enumerateprinters Api Limitation

## Fact
EnumPrintersW filters by PRINTER_ENUM_LOCAL/CONNECTIONS; doesn't discover remote-only printers.

## Why it matters
Expect some printers to be invisible to the API; document the limitation in user-facing docs.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/platform/windows.rs`
