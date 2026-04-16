---
name: graphql-data-simulation
description: Generate realistic GraphQL schema, query, and resolver mock data with kind-taxonomy nodes, field-projection responses, and step-based execution logs.
category: workflow
triggers:
  - graphql data simulation
tags:
  - auto-loop
version: 1.0.0
---

# graphql-data-simulation

GraphQL data simulation requires three coordinated layers: schema topology, query projection, and resolver execution traces. The schema layer models types as objects with `{name, kind, fields[]}` where `kind` is one of `root`, `object`, or `scalar`. Relationships are an explicit edge list of `[sourceType, targetType]` tuples representing field-return connections (e.g., `['Query','User']`, `['User','Post']`, `['Post','Comment']`). This separation of nodes from edges allows the visualization layer to choose layout algorithms independently. Seed at least 3 object types (User, Post, Comment) with cross-references, 2 root types (Query, Mutation), and 3 scalars (ID, String, Boolean) to demonstrate meaningful graph density without visual clutter.

The query-projection layer maintains a `selected` map of `{rootType: Set<fieldName>}` and constructs valid GraphQL syntax by iterating selected entries, emitting `rootType { ...fields }` blocks. Mock response data is a static array per root type (e.g., `users: [{id:'1', name:'Alice', email:'alice@dev.io'}]`) filtered through field-set projection: `fields.forEach(f => { if (f in item) out[f] = item[f] })`. This simulates GraphQL's defining feature — clients receive exactly the shape they request — without requiring a runtime executor. Always wrap results in `{"data": {...}}` to match the GraphQL response specification envelope.

Resolver execution traces model the async waterfall as an array of `{name, steps[], logs[]}` objects. Each step has a `{label, x, y}` for positioning and a corresponding log string. Model at least three scenarios: a simple root query (linear 4-step flow), a nested field resolver (6-step branching flow showing N+1 fetch patterns with DataLoader batching notes), and a mutation with authorization guard (4-step flow with AuthGuard middleware). Log entries should distinguish request direction with `→`/`←` prefixes and include timing-relevant details like "→ SELECT * FROM users WHERE id IN (2,3) [batched]" to surface the performance implications that make resolver design non-trivial.
