---
version: 0.1.0-draft
name: session-id-window-mapping
type: knowledge
category: flutter
summary: Desktop: unique session_id per connection; multi-window mapping via params['window_id'].
confidence: medium
tags: [flutter, mapping, session, window]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: flutter/lib/desktop/pages/remote_tab_page.dart
imported_at: 2026-04-19T00:00:00Z
---

# Session Id Window Mapping

## Fact
Desktop: unique session_id per connection; multi-window mapping via params['window_id'].

## Why it matters
Careful — reusing window_id across sessions leads to event crosstalk.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `flutter/lib/desktop/pages/remote_tab_page.dart`
