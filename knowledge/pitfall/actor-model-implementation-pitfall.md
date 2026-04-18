---
version: 0.1.0-draft
name: actor-model-implementation-pitfall
description: Shared mutable state and blocking calls silently break actor-model guarantees
category: pitfall
tags:
  - actor
  - auto-loop
---

# actor-model-implementation-pitfall

The most common mistake when building actor demos is leaking shared mutable state across actors — a module-level dict, a singleton cache, or a captured closure variable. Actors look correct in isolation but the "one message at a time" invariant is violated the moment two actors mutate the same object concurrently, and the bug is invisible in the visualization because the event log still shows clean per-actor message processing. Enforce isolation by construction: each actor owns its state as a private field, messages are deep-copied or frozen before enqueue, and any cross-actor data goes through explicit `send`. If you need shared read state, wrap it in its own actor and require a request/reply.

The second trap is blocking inside a message handler — a synchronous HTTP call, a `time.sleep`, a `Thread.join`, or in JS an `await` on an unbounded promise. A blocked actor still holds its mailbox lock, so upstream producers silently pile up messages, the mailbox grows past its bound, and the supervisor can't intervene because the actor hasn't crashed, it's just slow. Symptoms look like a leak but the root cause is a handler that should have been split into `receive → spawn task → send result back as a new message`. Add a handler-duration histogram to the visualization and alert on p99 exceeding the per-actor budget; this catches the pattern before it manifests as mailbox overflow.

The third pitfall is supervisor misconfiguration: `one_for_all` where `one_for_one` was intended, or a restart intensity (`max_restarts` / `max_seconds`) too permissive to ever trigger escalation. A `FlakyService` that crashes on every message with `one_for_all` will restart its innocent siblings forever, and the visualization will show a green tree while throughput is zero. Always display the supervisor's restart-intensity counters alongside each supervised subtree, and write test scenarios that deliberately exceed the intensity so you can confirm escalation propagates to the parent rather than looping silently.
