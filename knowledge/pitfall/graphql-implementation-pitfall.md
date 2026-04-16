---
name: graphql-implementation-pitfall
description: Common traps when parsing schemas, handling subscriptions, and rendering recursive types in GraphQL tooling
category: pitfall
tags:
  - graphql
  - auto-loop
---

# graphql-implementation-pitfall

**Recursive type unwrapping**: `NonNullType` and `ListType` wrap the real type (`[User!]!` is `NonNull(List(NonNull(User)))`). Forgetting to recurse through both wrappers produces edges pointing to "List" or "NonNull" pseudo-nodes instead of `User`. Always walk `.type` until you hit a `NamedType`, tracking nullability/list depth as metadata. Similarly, self-referential types (a `User` with a `friends: [User!]!` field) cause infinite loops in naive tree layouts — track visited node IDs and render self-edges as loops rather than expanding.

**Subscription lifecycle leaks**: `graphql-ws` or `subscriptions-transport-ws` clients hold open WebSocket connections; forgetting to call `unsubscribe()` in a React `useEffect` cleanup leaves zombie subscriptions that keep receiving events into unmounted components, causing `setState on unmounted` warnings and memory growth. Also, the older `subscriptions-transport-ws` is deprecated — new code should use `graphql-ws` with the `graphql-transport-ws` subprotocol, but servers often still speak only the old protocol, requiring client-side detection.

**Introspection-vs-SDL mismatch**: The introspection query returns a JSON structure missing directives, descriptions on arguments, and schema extensions (`extend type`). A visualizer built purely on `__schema` introspection will silently drop this information. Prefer `buildSchema(sdlString)` when SDL is available; fall back to `buildClientSchema(introspectionResult)` only for remote schemas — and warn the user that directive metadata may be incomplete. Also beware that some servers disable introspection in production, making the visualizer unusable without a manual SDL paste fallback.
