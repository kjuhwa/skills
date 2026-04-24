---
name: config-system-four-tiers
type: knowledge
category: configuration
summary: Four config tiers: Settings (persistent), Local (user), Display (per-display), Built-in (defaults).
confidence: medium
tags: [config, configuration, four, system, tiers]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: CLAUDE.md
imported_at: 2026-04-19T00:00:00Z
---

# Config System Four Tiers

## Fact
Four config tiers: Settings (persistent), Local (user), Display (per-display), Built-in (defaults).

## Why it matters
Layered config avoids 'one config.toml with 300 lines' anti-pattern.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `CLAUDE.md`
