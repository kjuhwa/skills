---
name: graphql-implementation-pitfall
description: Common failures when rendering schemas, building queries, and handling subscription streams in GraphQL UIs
category: pitfall
tags:
  - graphql
  - auto-loop
---

# graphql-implementation-pitfall

The most frequent pitfall is **treating GraphQL types as strings**. Field types are wrapped (`NonNull`, `List`, nested `List<NonNull<X>>`), and naive `type.name` access silently drops the wrappers, so the UI shows `User` where the schema actually says `[User!]!`. Always unwrap recursively and preserve the modifier chain when rendering — the distinction matters for validation in the query builder (a non-null argument must be supplied) and for arrow styling in the schema graph. Similarly, recursive types (`User.friends: [User!]!`) will infinite-loop a tree renderer that doesn't track visited nodes; schema graphs need cycle detection and the query builder needs a depth cap with a "expand further" affordance.

Subscription feeds fail in subtler ways. The WebSocket/SSE transport reconnects on network blips, and naive handlers re-subscribe without deduping, so users see the same event twice after a flaky connection. Key events by `(subscriptionId, sequence)` or a server-provided event ID and drop duplicates. Also: subscription payloads arrive out-of-order under load — don't assume `Date.now()` on receipt is the event time; use the server timestamp from the payload. Unbounded feed lists are a memory leak in long-lived demos; cap at N (500–1000) with a ring buffer and surface "older events evicted" rather than silently dropping.

Finally, **introspection is not free and not always allowed**. Production endpoints disable `__schema` queries, so a tool that only works via live introspection breaks against real APIs. Always support SDL upload / paste as a fallback input, and cache introspection results in `localStorage` keyed by endpoint URL + schema hash so reopening the app doesn't re-fetch a 500KB schema. Watch for `@deprecated` fields: the builder should still let users select them (they're valid) but render them struck-through with the deprecation reason in the tooltip — hiding them entirely breaks queries that legitimately need the field during a migration window.
