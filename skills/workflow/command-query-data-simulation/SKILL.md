---
name: command-query-data-simulation
description: Prefix-based verb classification and stochastic command/query/event generation for CQRS simulation loops.
category: workflow
triggers:
  - command query data simulation
tags:
  - auto-loop
version: 1.0.0
---

# command-query-data-simulation

Define two canonical verb-prefix lists that partition all operations into commands and queries by naming convention. Commands start with mutating verbs — `create`, `update`, `delete`, `remove`, `set`, `add`, `insert`, `post`, `put`, `patch`, `save`, `send`, `execute`, `run`, `process`, `approve`, `reject`. Queries start with read-only verbs — `get`, `fetch`, `find`, `list`, `search`, `count`, `check`, `is`, `has`, `read`, `load`, `query`, `select`, `show`, `lookup`. Classification is a simple `name.toLowerCase().startsWith(prefix)` scan against these lists, defaulting to query when no command prefix matches. This convention mirrors real-world API naming (REST verbs, service method names) and makes the simulation feel realistic without requiring a schema or metadata.

For autonomous simulation, maintain parallel name pools — e.g., `['CreateUser', 'UpdateCart', 'DeleteComment', 'PlaceOrder', 'ChangeEmail']` for commands and `['GetProfile', 'ListOrders', 'SearchItems', 'FetchMetrics', 'CountUsers']` for queries. Drive the loop with `setInterval` at 1.2–2.5 second intervals. On each tick, draw a random number: below a threshold (e.g., 0.4) emit a command followed by a correlated domain event after a short random delay (300–500ms) to model eventual consistency; above the threshold emit a standalone query. The event name is derived from the command name by stripping the verb prefix and appending a past-tense suffix (e.g., `CreateUser → UserCreated`, `PlaceOrder → OrderPlaced`), simulating the event-sourcing convention of "command in, event out."

For interactive simulation (separator mode), feed a mock array of mixed operation names through staggered `setTimeout` calls (e.g., `i * 300ms`) to auto-populate the UI on load, then let the user type arbitrary method names for live classification. Track running counts per category and compute ratio percentages (`count / total * 100`) to power ratio visualizations. Cap the in-memory journal at a fixed window (e.g., 60 entries via `shift()`) to bound memory regardless of run duration.
