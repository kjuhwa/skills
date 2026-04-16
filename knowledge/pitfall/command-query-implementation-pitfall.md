---
name: command-query-implementation-pitfall
description: Common failure modes when implementing CQRS visualizations and command/query separation logic.
category: pitfall
tags:
  - command
  - auto-loop
---

# command-query-implementation-pitfall

The most dangerous pitfall in prefix-based command-query classification is the false-negative on commands that use non-standard verbs. The apps above hardcode 17 command prefixes and 15 query prefixes, then default anything unmatched to "query." This means a method named `cancelOrder`, `revertPayment`, or `archiveThread` — all clearly state-mutating — will silently classify as queries because `cancel`, `revert`, and `archive` aren't in the prefix list. In production tooling this creates a false sense of read-safety: an operation marked as a "query" gets routed to a read replica or cached aggressively, but it actually mutates state. The fix is to invert the default: classify as a command unless a known read-only prefix matches, since misclassifying a read as a write is harmless (extra caution), while misclassifying a write as a read can corrupt data.

The second pitfall is in the event-correlation timing model. The pipeline app chains particles with fixed `setTimeout` delays (0, 400, 800, 1200ms) and the journal app derives events after `300 + random * 500ms`. These fixed-delay models give users a false mental model of CQRS latency — real eventual consistency has variable, potentially unbounded propagation delay. When users build systems based on this intuition, they assume read models update within a second of the command, leading to missing data bugs where a query issued immediately after a command returns stale state. Simulations should include occasional "slow projection" spikes (e.g., 5–10 second delays) and at least one scenario where a query explicitly returns stale data to teach the consistency boundary.

The third pitfall is DOM and memory management in long-running visualizations. The journal app caps at 60 entries in-memory and 40 DOM nodes, but the pipeline app's particle array and the separator app's column DOM grow without bound. At 1 dispatch per 2.5 seconds, the separator accumulates ~1,440 DOM nodes per hour. The particle array is naturally bounded by the `t > 1` filter, but if the tab is backgrounded (requestAnimationFrame pauses), particles accumulate without being filtered, causing a burst of CPU when the tab refocuses. Always enforce both a data-structure cap (`entries.length > MAX → shift()`) and a DOM cap (`children.length > N → removeChild(lastChild)`), and use `document.visibilitychange` to pause generation when the tab is hidden.
