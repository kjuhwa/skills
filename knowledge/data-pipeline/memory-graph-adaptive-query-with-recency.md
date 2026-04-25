---
version: 0.1.0-draft
name: memory-graph-adaptive-query-with-recency
summary: Query agent memory as a DAG, prioritize recency, cap nodes, merge related events
category: data-pipeline
confidence: high
tags: [evolver, data-pipeline, memory-graph, llm-context, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/memoryGraph.js
  - src/gep/memoryGraphAdapter.js
imported_at: 2026-04-18T00:00:00Z
---

# Memory as a causal DAG, queried with recency bias

Store agent memory as a DAG — events are nodes, causality is edges. When querying (for evolution analysis, LLM context, or reporting), traverse with three constraints:

1. **Recency bias** — newer events have higher weight; old siblings are pruned first.
2. **Hard node cap** — e.g., 1000 nodes returned. Prevents context explosion.
3. **Similarity merge** — fold near-duplicate events (same error class, same tag) into a single representative node with a count.

## Why a DAG over a flat log

- Preserves causal chains: "error E caused retry R caused fix F".
- Merging happens only within semantically related siblings, not arbitrarily across time.
- Enables "explain this failure" traversals (walk ancestors) and "what did this decision unlock" (walk descendants).

## Reuse notes

Any agent memory system. The specific schema doesn't matter; what matters is: edges encode causality, recency drives pruning, merging prevents context bloat.
