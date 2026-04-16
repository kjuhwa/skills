---
name: backpressure-implementation-pitfall
description: Conflating rate limiting with backpressure hides the upstream feedback loop that defines it
category: pitfall
tags:
  - backpressure
  - auto-loop
---

# backpressure-implementation-pitfall

The most common mistake in backpressure demos is implementing what is actually **rate limiting** or **load shedding** and calling it backpressure. If the consumer simply drops items it cannot handle, or the producer sleeps on a fixed interval, there is no feedback channel — and backpressure *is* the feedback channel. The diagnostic: remove the producer-facing PAUSE/credit/window signal from your sim. If behavior is unchanged, you built a throttle, not backpressure. Always make the reverse signal a first-class, visible entity in both the model and the UI.

A second trap is **hysteresis collapse**: using a single threshold (e.g., pause at 80% full, resume at 80% full) causes rapid PAUSE/RESUME oscillation that looks like a bug. Always use distinct low and high watermarks (commonly 25% / 75%) so the producer gets breathing room after resume. Related: when multiple producers share a buffer, broadcasting PAUSE to all of them causes thundering-herd resume — stagger RESUME signals or use per-producer credit instead.

Third, the **unbounded queue illusion**: allowing the buffer to grow without limit "to avoid drops" just moves the failure from the buffer to memory and makes latency unbounded. Every backpressure sim must expose the reality that *some* resource is always bounded; the design choice is which one fails visibly. Show memory growth, latency growth, or drop count explicitly — hiding any of the three misleads viewers about the real tradeoff.
