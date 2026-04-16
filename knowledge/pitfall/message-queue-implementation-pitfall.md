---
name: message-queue-implementation-pitfall
description: Common correctness and UX bugs when implementing visualized message queue demos
category: pitfall
tags:
  - message
  - auto-loop
---

# message-queue-implementation-pitfall

The most frequent bug is conflating visual state with authoritative queue state. Developers animate a dequeue by removing the DOM node first and updating the underlying array on animation end — but if a user pauses, scrubs, or triggers another enqueue mid-animation, the array and DOM diverge and subsequent operations corrupt ordering. Always mutate the authoritative model synchronously on the event, then drive the animation from a diff between previous and current model snapshots; never let the animation own state.

Priority heap implementations commonly break the heap invariant during visualization because developers interleave sift-up steps with setTimeout-based animations and a second insert lands before the first finishes sifting. The fix is a work queue: each logical operation (insert, extract-min) enqueues a sequence of atomic steps, and the animator drains them serially regardless of user input rate. Related pitfall: rendering the heap as a tree while storing it as an array-index heap, and getting the parent/child index math wrong at boundaries (index 0 vs 1-based) so animations point to the wrong nodes.

Pub-sub grids fail subtly when fan-out is implemented as N synchronous deliveries in a tight loop — one slow or crashed subscriber freezes the whole publish and the visualization misleadingly shows instant delivery. Model each subscriber as an independent consumer with its own buffer and delivery timer, and show per-subscriber lag explicitly; otherwise operators learn the wrong mental model about how real brokers (Kafka, Redis Streams, NATS) behave under subscriber heterogeneity. Also beware unbounded producer rates in demos — without a visible cap or backpressure signal, the simulation quickly exceeds what the renderer can animate and the UI stutters, hiding the very backpressure behavior you meant to teach.
