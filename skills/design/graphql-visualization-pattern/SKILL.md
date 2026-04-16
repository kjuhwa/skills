---
name: graphql-visualization-pattern
description: Render GraphQL schema types, query trees, and resolver execution flows using layered canvas/SVG/DOM techniques with relationship-aware highlighting.
category: design
triggers:
  - graphql visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# graphql-visualization-pattern

GraphQL visualizations benefit from a three-tier rendering strategy matched to the abstraction level being shown. Schema-level views (type galaxies, constellation maps) work best on HTML5 Canvas with radial or force-directed layouts, where types are positioned by kind — root types (Query, Mutation) occupy an inner orbit, object types sit in a middle ring, and scalar types (ID, String, Boolean) float on the outer edge. Node radius and color encode the kind taxonomy (e.g., teal for roots, sky blue for objects, slate gray for scalars). Edges between types represent field-return relationships and should brighten on hover while dimming unconnected edges to `rgba(…, 0.12)`, giving an instant "impact radius" view of any selected type. Hit-testing uses Euclidean distance (`Math.hypot`) with a 4px tolerance buffer around each node.

Query-building interfaces shift to DOM-based panels because users need clickable, scrollable field lists — not freeform graph exploration. A two-panel layout works reliably: a left sidebar (fixed ~320px) listing root query types with toggleable field checkboxes backed by `Set` state per root, and a right panel that live-renders the constructed GraphQL query string with indented formatting (`{\n  users {\n    id\n    name\n  }\n}`). Mock result generation filters static seed data through the selected field sets, projecting only chosen keys from each record to simulate the exact-shape-response contract that distinguishes GraphQL from REST.

Resolver execution flows demand SVG with sequential step animation. Each resolver stage (Client → Query.posts → PostResolver → DB) is drawn as a rounded rectangle at hardcoded coordinates connected by dashed arrows (`stroke-dasharray: '6,4'`). A `setTimeout`-based animation loop (600ms per step) highlights the active stage in teal while appending timestamped log lines — using arrow prefixes (`→` for requests, `←` for responses) to distinguish direction. For branching resolvers like Post.author (which triggers a nested field resolver), draw a secondary arrow path from the parent resolver to the child, explicitly modeling the N+1 execution pattern that DataLoader is designed to batch.
