---
version: 0.1.0-draft
name: narrative-memory-event-storytelling
summary: Build narrative memory by linking events into causal stories for better recall and reflection
category: observability
confidence: medium
tags: [evolver, observability, narrative, memory, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/narrativeMemory.js
imported_at: 2026-04-18T00:00:00Z
---

# Narrative memory over flat event logs

LLMs reason better about coherent stories than about flat event lists. Narrative memory groups events into causal "stories":

> "User asked X → agent tried approach A → failed with error E → learned lesson L → retried with approach B → succeeded."

## Representation

Each narrative is a linked list of event nodes with:
- `caused_by` edges for causality
- `resolved_by` edges for recovery
- shared `topic` tag so related narratives can be joined

## Why

- Retrieval becomes targeted (pull one narrative instead of 20 raw events).
- Reflection prompts have better hooks ("you failed twice on X because…").
- Downstream summarization gets a stable unit to operate on.

## Reuse notes

The hard part is deciding when a narrative ends. Heuristics that work: explicit resolution (success event following a failure chain), topic drift (new tag family), or inactivity (≥N minutes without related events).
