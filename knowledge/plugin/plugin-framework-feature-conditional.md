---
version: 0.1.0-draft
name: plugin-framework-feature-conditional
type: knowledge
category: plugin
summary: Plugin framework gated by feature='plugin_framework' and non-mobile; dynamic .dll/.so loading.
confidence: medium
tags: [conditional, feature, framework, plugin]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/plugin/
imported_at: 2026-04-19T00:00:00Z
---

# Plugin Framework Feature Conditional

## Fact
Plugin framework gated by feature='plugin_framework' and non-mobile; dynamic .dll/.so loading.

## Why it matters
Mobile platforms disallow dynamic code loading — don't expose the feature there.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/plugin/`
