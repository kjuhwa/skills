---
name: kafka-avro-change-flag-contract
version: 0.1.0-draft
tags: [api, kafka, avro, change, flag, contract]
title: Kafka Avro event contract — actionType + per-section change flags
category: api
summary: Every Configuration-domain Avro event carries an `actionType` enum (INSERT/UPDATE/DELETE) plus boolean change flags per mutable section (e.g. `parentChanged`, `tagFiltersChanged`, `configurationsChanged`) rather than full before/after payloads.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  files:
    - doc/ConfigurationGroupAvro.md
    - src/main/avro/ConfigurationGroupAvro.avsc
confidence: high
---

## Fact

ConfigurationGroupAvro schema exposes: `actionType`, `groupType`, identifying fields, hierarchy fields, plus `parentChanged`, `tagFiltersChanged`, `configurationsChanged` booleans and child-delta arrays (`addedConfigurationIds`, `removedConfigurationIds`). Consumers branch on flags instead of diffing payloads.

## Why

- DELETE events carry only identifying fields; consumers shouldn't require full state to react.
- Flags let narrow consumers (e.g. a permission cache that only cares about parent changes) short-circuit cheaply.
- Collection membership carried as deltas separates "what changed" from "current state".

## How to apply

- When producing one of these events, compute each flag against the pre-image; never leave UPDATE flags at default-false.
- When consuming, dispatch on `actionType` first, then on the `*Changed` flags; tolerate multiple flags true in one event.
- Adding a new mutable section should be additive: one new flag + fields, existing consumers unchanged.

## Counter / caveats

- Flags are informational. Consumers with hard correctness requirements under replay should still diff critical fields against their own state, not trust flags blindly.
