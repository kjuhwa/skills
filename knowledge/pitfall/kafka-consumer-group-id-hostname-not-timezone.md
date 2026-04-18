---
version: 0.1.0-draft
tags: [pitfall, kafka, consumer, group, hostname, not]
name: kafka-consumer-group-id-hostname-not-timezone
description: Kafka consumer group-id must derive from a stable node identifier (hostname), never from a timezone/locale string — a silent typo will split consumers into unintended groups.
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-meta@561b6b1
confidence: high
---

# Kafka Group-ID Derivation Pitfall

## Fact

Commit `561b6b1` ("타임존 오타 및 카프카 컨슈머 그룹아이디 수정") fixed a bug where a Kafka consumer `group.id` was built from a string that also happened to contain timezone information. A typo in the timezone segment gave every instance a different group id, so each replica consumed *all* partitions of a broadcast topic as its own group → duplicate side effects, no load balancing.

Correct pattern used now: `group.id = <service>-<NODE_ID>` where `NODE_ID` resolves from hostname (`SchedulingConstants.NODE_ID`).

## Why it matters

- Symptom is silent: the app works, tests pass, but in prod every replica processes every message.
- Detection requires comparing group-id across pods — operators rarely do this unless duplicate-processing incidents prompt it.

## How to apply

- `group.id` should be built from: (a) a **stable** service identifier, and (b) either hostname (work-sharing across replicas) or a unique per-pod id (broadcast to every replica) — never both, never a locale/timezone string.
- Add an assertion log line at startup: `log.info("kafka group.id resolved: {}", groupId)` and eyeball across pods in rollouts.
- When reviewing Kafka-related PRs, grep for any group-id string concatenating runtime-derived values other than hostname or pod id.
