---
version: 0.1.0-draft
name: traceability-registry
summary: Traceability registry YAML mapping technical requirements to architecture decisions
category: architecture
confidence: medium
tags: [game-studios, ccgs, traceability, requirements, architecture-registry]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: docs/architecture/tr-registry.yaml
imported_at: 2026-04-18T00:00:00Z
---

# Technical Requirement ID Registry
#
# PURPOSE: Persistent, stable IDs for every GDD technical requirement.
# Prevents TR-ID renumbering across /architecture-review runs, which would
# break story references.
#
# RULES:
#   - IDs are PERMANENT. Never renumber, never delete (use status: deprecated).
#   - Add new entries only at the END of each system's list.
#   - When a GDD requirement is reworded (same intent): update `requirement`
#     text and add a `revised` date. The ID stays the same.
#   - When a requirement is removed from the GDD: set status: deprecated.
#   - When a requirement is split or replaced: set status: superseded-by with
#     the new TR-ID(s).
#
# WRITTEN BY: /architecture-review (appends new entries, never overwrites)
# READ BY:    /create-stories (embed IDs in stories)
#             /story-done (look up current requirement text at review time)
#             /story-readiness (validate TR-ID exists and is active)
#
# ID FORMAT: TR-[system-slug]-[NNN]
#   system-slug = short slug matching the GDD system name
#   NNN = three-digit zero-padded sequence per system, starting at 001
#
# STATUS VALUES: active | deprecated | superseded-by: TR-[system]-NNN

version: 1
last_updated: ""

requirements: []

# --- EXAMPLE ENTRIES (remove when first real entries are added) ---
#
# - id: TR-combat-001
#   system: combat
#   gdd: design/gdd/combat-system.md
#   requirement: "Player takes damage from enemies based on attack power minus defence"
#   created: 2026-03-10
#   revised: ""
#   status: active
#
# - id: TR-combat-002
#   system: combat
#   gdd: design/gdd/combat-system.md
#   requirement: "Combo window timing is 0.4 seconds between hits"
#   created: 2026-03-10
#   revised: "2026-04-01"
#   status: active
#
# - id: TR-combat-003
#   system: combat
#   gdd: design/gdd/combat-system.md
#   requirement: "Old damage formula using raw stats"
#   created: 2026-03-10
#   revised: ""
#   status: superseded-by: TR-combat-001
