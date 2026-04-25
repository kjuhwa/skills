---
version: 0.1.0-draft
name: gep-protocol-auditable-assets
summary: Genome Evolution Protocol (GEP) represents an autonomous loop's "DNA" as three on-disk artifacts — reusable `Gene` definitions, success `Capsule`s, and an append-only `events.jsonl` — so every autonomous change has a signed, auditable trail.
category: reference
confidence: medium
tags: [gep, evolver, audit, genes, capsules, jsonl, autonomous-agent]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# GEP Protocol — Auditable Evolution Assets

## Purpose

The Genome Evolution Protocol (GEP) exists to answer two questions at audit time:

1. What decision did the autonomous loop make this iteration, and why?
2. What reusable knowledge did it create or update as a result?

It does that with a small fixed set of artifacts on disk.

## The three files

All under `assets/gep/` in an evolver-managed repo:

| File | Shape | Role |
|---|---|---|
| `genes.json` | Array of `Gene` records | Reusable decision templates — "when signal X appears, apply transformation Y, then validate with Z" |
| `capsules.json` | Array of `Capsule` records | Outcome records of a successful evolution step — inputs, the chosen gene, the patch, the validation result |
| `events.jsonl` | Append-only JSONL | Every non-trivial action the loop took — gene selection, validation runs, solidify, rollback |

## Gene (reusable decision)

Each `Gene` carries at minimum:

- `id` — stable identifier.
- `signals` — shape of runtime evidence that makes this Gene applicable (e.g. `log_error:ENOENT`, `perf_bottleneck`).
- `transformation` — description of what to change (often just a prompt template, not code).
- `validation` — array of shell commands that must pass before the change is accepted (see the `validation-command-allowlist-gate` skill).
- `metadata` — provenance: author, created_at, last_used_at.

Genes are **selected, never mutated in place**; an "improved" Gene is a new record with a new ID and a link back.

## Capsule (successful outcome)

Capsules are write-once records emitted after a Gene succeeds end-to-end:

- `gene_id` used.
- `signals` matched this round.
- `patch` or `prompt` produced.
- `validation_output` (the command outputs that passed).
- `solidify_commit` — git SHA after the change was kept.

They become training/reference material for future gene selection without re-running the work.

## events.jsonl (append-only)

One JSON object per line, append-only, never rewritten. Each record has at minimum:

```json
{
  "id": "<uuid-v7>",
  "ts": "<iso8601>",
  "kind": "gene_selected" | "validation_ran" | "solidified" | "rolled_back" | ...,
  "iteration_id": "...",
  "payload": { ... }
}
```

Because it's append-only, you can reconstruct any iteration by replaying a slice of the file. Use UUIDv7 for `id` to keep lines naturally time-ordered.

## Rules to keep the trail trustworthy

- **No silent overwrites.** Promoting an external Gene with the same ID as a local one is rejected, not merged.
- **Commands in `validation` are audited at promote time**, not just at first use.
- **Only the DNA emoji** is allowed in GEP-adjacent docs (evolver convention); all other emoji are stripped. This is a canary for accidental re-renders of arbitrary text into the audit stream.

## Source

- Evolver repo, `assets/gep/*` and `src/gep/selector.js`, `src/gep/solidify.js`, `src/gep/assetStore.js`. Core evolution modules are distributed obfuscated in the public tree — the protocol shape is from the SKILL.md / README, not from reading the obfuscated JS.
