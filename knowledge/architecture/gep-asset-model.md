---
version: 0.1.0-draft
name: gep-asset-model
summary: Evolver's GEP (Genome Evolution Protocol) stores evolution state as three on-disk assets — reusable Genes, success Capsules, and an append-only EvolutionEvents log — so every change is auditable and the selector can score candidates by signal match.
category: architecture
tags: [gep, evolver, genes, capsules, events, audit]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - README.md (GEP Protocol section)
  - SKILL.md (GEP Protocol section)
  - assets/gep/genes.json
  - assets/gep/capsules.json
  - assets/gep/events.jsonl
imported_at: 2026-04-18T03:00:00Z
---

# GEP Asset Model (Evolver reference)

The Genome Evolution Protocol persists three files under `assets/gep/`:

| File | Kind | What it holds |
|---|---|---|
| `genes.json` | JSON array | Reusable Gene definitions — named evolution strategies with validation commands and match signals |
| `capsules.json` | JSON array | "Success Capsules" — snapshots of successful Gene applications (patterns known to work) |
| `events.jsonl` | JSONL | Append-only EvolutionEvent log — one line per evolution iteration, with `intent`, `genes_used`, `outcome.status`, `outcome.reason` |

## Why three files, not one

- **Genes** are *what to try* — finite library, read often, edited rarely.
- **Capsules** are *what has worked* — grow monotonically, used by the selector as priors.
- **Events** are *what happened* — write-once, append-only; cheap to scan for recurring failure signatures without rewriting the file.

Using JSONL for events (not JSON) is deliberate: an unclean shutdown leaves a well-formed prefix, not a syntactically-broken file.

## Selector flow

1. Scan `memory/` for runtime signals (errors, perf, patterns).
2. Score Genes and Capsules against the signal set.
3. Emit a JSON selector decision in the GEP prompt.
4. After application, append an EvolutionEvent with the outcome.

## Extraction safety

External Gene/Capsule assets ingested via `scripts/a2a_ingest.js` land in an isolated candidate zone. Promotion to the local stores (`scripts/a2a_promote.js`) requires:

1. Explicit `--validated` flag (operator verification).
2. Gene `validation` commands pass the `isValidationCommandAllowed` gate (see `validation-command-whitelist-gate` skill).
3. Promotion **never** overwrites an existing local Gene with the same ID.

## Constraint callout

The docs only permit the DNA emoji in evolver-authored content; all other emoji are disallowed. It's an enforced style rule, not a preference.
