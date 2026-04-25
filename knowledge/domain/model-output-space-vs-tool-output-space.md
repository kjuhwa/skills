---
version: 0.1.0-draft
name: model-output-space-vs-tool-output-space
type: knowledge
category: domain
summary: The 'model output space' (216 NN labels in standard_v3_3) is a strict subset of the 'tool output space' (model outputs + 5 generic labels).
confidence: high
tags: [magika, domain]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Model Output Space Vs Tool Output Space

## Fact

The DL model has a fixed label set (e.g. 216 in v3_3). The tool layer adds: empty (zero-byte file), directory, symlink, txt (generic text fallback), unknown (generic binary fallback). API consumers must handle these tool-only labels — they cannot come from the model.

## Evidence

- `assets/models/standard_v3_3/README.md:8-12`
