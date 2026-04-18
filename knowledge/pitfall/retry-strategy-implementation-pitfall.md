---
version: 0.1.0-draft
name: retry-strategy-implementation-pitfall
description: Common failure modes when building retry strategy demos: unbounded growth, jitter miscalculation, and thundering herd blind spots
category: pitfall
tags:
  - retry
  - auto-loop
---

# retry-strategy-implementation-pitfall

The most frequent bug in retry visualizers is applying jitter multiplicatively to the already-capped delay instead of capping after jitter. The correct order is: compute raw exponential delay → apply jitter → clamp to max-delay. Reversing this lets jitter push delays above the configured ceiling, which misrepresents how production libraries (AWS SDK, Polly, resilience4j) actually behave. Similarly, "full jitter" is `random(0, backoff)` not `backoff ± random(0, jitter%)` — confusing these two produces visibly wrong sequences and teaches users the wrong mental model. Always cite the jitter formula in the UI (e.g. "full jitter: delay = rand(0, min(cap, base·2^n))") so viewers can verify.

A second pitfall: forgetting that retry storms emerge from correlation, not from any single client's config. A playground that only simulates one request cannot show the thundering herd problem — when 10,000 clients retry the same failed upstream with identical exponential backoff, they synchronize on the same retry instants and hammer the service in waves. Decorrelated jitter exists specifically to break this synchronization, and its value is invisible without multi-client simulation. If the demo advertises "retry storm" or "backoff comparison," it must render at least a histogram of dispatch times across N simulated clients, otherwise the educational claim is hollow.

Third, deadline/budget logic is routinely wrong. Many implementations check `attemptCount < maxAttempts` but forget the cumulative-elapsed check, so a config like `maxAttempts=10, baseDelay=1s, multiplier=2` schedules an attempt at t=1024s even when the operation's deadline was 30s. The retry loop must evaluate BOTH bounds before sleeping, and the visualization must render the deadline as a hard vertical line with any attempts past it greyed-out and labeled "aborted: deadline exceeded." Omitting this makes exponential backoff look safer than it is and hides the exact failure mode that causes incidents in production.
