---
version: 0.1.0-draft
name: etl-implementation-pitfall
description: Common failures when building ETL visualization UIs that feel wrong to data engineers
category: pitfall
tags:
  - etl
  - auto-loop
---

# etl-implementation-pitfall

The biggest pitfall is treating ETL graphs as static diagrams. Data engineers open these tools to answer operational questions — "why is this table stale?", "what breaks if I drop this column?", "which rule caused the null spike yesterday?" — so a visualization that only shows structure without state (last-run time, row count, error rate, schema drift) is immediately dismissed as a toy. Every node must carry live operational metadata, even in demo/mock mode. A lineage map without freshness indicators is a wireframe, not a tool.

Second pitfall: getting column-level lineage wrong. Many implementations stop at table-level edges, but real debugging requires tracing a specific column from source to sink through every transformation. This means rules in etl-rule-builder must declaratively expose their input→output column mappings, not just run opaque JavaScript. If your rule system uses free-form code, you've lost lineage. Use a constrained rule DSL (SELECT/MAP/FILTER/JOIN primitives) so column provenance can be computed statically.

Third pitfall: performance collapses at 100+ nodes. SVG rendering with React reconciliation of every node as a component hits frame-drops around 150 nodes. Switch to Canvas (with offscreen rendering for static layers) or use react-flow with virtualization enabled, and only re-render the specific node whose state changed rather than the whole graph. Also: do not animate edge dash-offsets on every node simultaneously — batch the animation to a single requestAnimationFrame loop that mutates a shared CSS custom property, not per-edge React state.
