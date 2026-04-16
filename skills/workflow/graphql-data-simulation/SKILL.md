---
name: graphql-data-simulation
description: Mock GraphQL schema, operation, and subscription-event generation for visualizer-only apps without a live server
category: workflow
triggers:
  - graphql data simulation
tags:
  - auto-loop
version: 1.0.0
---

# graphql-data-simulation

Visualizer/playground-style GraphQL apps often need to demo functionality without requiring users to connect a real endpoint. Build a three-tier simulation module: (1) a **schema fixture** exporting SDL strings for realistic domains (blog, e-commerce, social) that exercise every GraphQL feature — scalars, enums, unions, interfaces, input types, directives — so the visualizer handles edge cases; (2) an **operation executor** built on `graphql-js` `execute()` with a `rootValue` resolver map that returns faker-generated data keyed by field name and type (e.g., `User.email` → `faker.internet.email()`, `Post.createdAt` → random ISO date within last 30 days); and (3) a **subscription emitter** using `setInterval` or a seeded PRNG timeline that pushes synthetic events into a `PubSub`-style channel the monitor subscribes to.

The subscription simulator should model realistic patterns: bursty traffic (Poisson arrivals), occasional error payloads (5–10% rate), connection drops every N minutes to exercise reconnect logic, and variable payload sizes. Expose knobs via a debug panel — event rate, error rate, payload size distribution — so users can stress-test the UI. Seed the PRNG from a URL param so demo states are reproducible and shareable.

Keep simulation code behind a `USE_MOCK` flag with the same interface as the real client (e.g., both expose `{ executeQuery, subscribe }`), so swapping to a live endpoint is a single import change. This also enables E2E tests to run deterministically against the mock without network.
