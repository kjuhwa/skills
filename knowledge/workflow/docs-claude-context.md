---
version: 0.1.0-draft
name: docs-claude-context
summary: Claude context file for docs directory — guidelines for documentation authoring
category: workflow
confidence: medium
tags: [game-studios, ccgs, claude-md, documentation, context]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: docs/CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

# Docs Directory

When authoring or editing files in this directory, follow these standards.

## Architecture Decision Records (`docs/architecture/`)

Use the ADR template: `.claude/docs/templates/architecture-decision-record.md`

**Required sections:** Title, Status, Context, Decision, Consequences,
ADR Dependencies, Engine Compatibility, GDD Requirements Addressed

**Status lifecycle:** `Proposed` → `Accepted` → `Superseded`
- Never skip `Accepted` — stories referencing a `Proposed` ADR are auto-blocked
- Use `/architecture-decision` to create ADRs through the guided flow

**TR Registry:** `docs/architecture/tr-registry.yaml`
- Stable requirement IDs (e.g. `TR-MOV-001`) that link GDD requirements to stories
- Never renumber existing IDs — only append new ones
- Updated by `/architecture-review` Phase 8

**Control Manifest:** `docs/architecture/control-manifest.md`
- Flat programmer rules sheet: Required / Forbidden / Guardrails per layer
- Date-stamped `Manifest Version:` in header
- Stories embed this version; `/story-done` checks for staleness

**Validation:** Run `/architecture-review` after completing a set of ADRs.

## Engine Reference (`docs/engine-reference/`)

Version-pinned engine API snapshots. **Always check here before using any
engine API** — the LLM's training data predates the pinned engine version.

Current engine: see `docs/engine-reference/godot/VERSION.md`
