---

name: graphql-data-simulation
description: Faking GraphQL responses, schemas, and subscription streams for offline demos without a live server
category: workflow
triggers:
  - graphql data simulation
tags: [workflow, graphql, data, simulation, schema]
version: 1.0.0
---

# graphql-data-simulation

For demo apps that showcase GraphQL tooling, running a real Apollo/Yoga server is overkill and brittle in static hosting. Instead, simulate in three layers. **Schema layer**: ship a hand-written SDL string (or a small JSON introspection dump) as a module export — this is what the schema-graph and query-builder introspect against. Keep it representative (object types, interfaces, unions, enums, input types, custom scalars, `@deprecated`) so every UI branch has something to render. **Query execution layer**: implement a tiny resolver over a seeded in-memory dataset, or a `Map<queryHash, fixtureResponse>` lookup keyed by the normalized query string. Return results via `Promise.resolve()` wrapped in an artificial `setTimeout` so loading states actually appear.

**Subscription layer**: simulate push with `setInterval` emitting synthetic events into an `EventTarget` or RxJS `Subject`, and have the feed component subscribe to that. Vary the cadence (burst of 5 in 200ms, then idle 3s) so backpressure, batching, and deduplication UI behaviors are visible in a demo. Seed event payloads from a small pool with deterministic-but-jittered fields (timestamps `Date.now()`, IDs from a counter, enum values cycled) so the feed looks alive without being random noise.

Gate the simulation behind a single `USE_MOCK_GRAPHQL` flag or a `createClient({mode: 'mock' | 'real'})` factory so the same components run against a real endpoint later with zero changes. Keep fixtures colocated with the mock client (`mocks/schema.graphql`, `mocks/fixtures.ts`) — not scattered across components — so updating the demo story is a one-file edit.
