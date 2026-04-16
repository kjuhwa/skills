---
name: outbox-pattern-visualization-pattern
description: Visualize outbox pattern by rendering DB transaction, outbox table, relay polling, and broker delivery as parallel swim-lanes with per-message state transitions
category: design
triggers:
  - outbox pattern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# outbox-pattern-visualization-pattern

Model the outbox flow as four synchronized lanes — **Business Transaction**, **Outbox Table**, **Relay/Poller**, and **Message Broker/Consumer** — so users can see the atomic boundary between the first two lanes and the at-least-once boundary between the last two. Each outbox row is a first-class visual entity with a stable ID and a lifecycle (`PENDING` → `PICKED` → `PUBLISHED` → `ACKED` / `FAILED` → `RETRY`), color-coded per state; moving a row across lanes should animate as a translation, not a teleport, so viewers register the causal handoff.

Overlay two diagnostic channels that make the pattern's guarantees falsifiable at a glance: a **transaction envelope** (a dashed rectangle around the business write + outbox insert that flashes red if the two are split) and a **duplicate/out-of-order marker** on the consumer lane (a small badge counting re-deliveries for each aggregate ID). Surface the poller's cursor (last-published offset or `processed_at IS NULL` predicate) as a moving vertical line on the outbox lane — this is the single most effective affordance for explaining why messages are never lost even if the relay crashes between pick and publish.

Provide controls that directly manipulate failure modes rather than abstract sliders: a "kill relay mid-batch" button, a "broker 500 on publish" toggle, a "DB commit but crash before ack" scenario, and a speed control that slows the publish step so learners can watch the retry re-emit the same `outbox_id`. Pair each visualization tick with an event log entry (`tx#42 inserted outbox row 789; relay picked 789; publish failed; retry scheduled +2s`) so the animation and the textual trace reinforce each other.
