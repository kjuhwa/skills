---
version: 0.1.0-draft
name: excel-xml-clipboard-format-special-case
type: knowledge
category: clipboard
summary: Excel exports as XML Spreadsheet format (not standard MIME); clipboard bridges need a branch to preserve Excel fidelity.
confidence: high
tags: [case, clipboard, excel, format, special, xml]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/clipboard.rs
imported_at: 2026-04-19T00:00:00Z
---

# Excel Xml Clipboard Format Special Case

## Fact
Excel exports as XML Spreadsheet format (not standard MIME); clipboard bridges need a branch to preserve Excel fidelity.

## Why it matters
Losing Excel XML silently downgrades rich paste to plain text.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/clipboard.rs`
