---
name: schema-registry-data-simulation
description: Generating realistic schema evolution fixtures covering compatibility modes and breaking-change taxonomy
category: workflow
triggers:
  - schema registry data simulation
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-data-simulation

To simulate a schema registry without a live Confluent/Apicurio instance, seed fixtures as an array of `{subject, version, schema, compatibilityMode, registeredAt}` records where each subject has 4-8 versions demonstrating the full taxonomy of changes: additive (new optional field with default), field rename via alias, type widening (int→long), enum value addition, nested record extension, and intentionally breaking changes (required field addition without default, type narrowing, enum value removal) that should fail the declared compatibility mode. Include at least one subject per compatibility mode (BACKWARD, BACKWARD_TRANSITIVE, FORWARD, FORWARD_TRANSITIVE, FULL, FULL_TRANSITIVE, NONE) so the UI exercises each rule set.

Generate schemas across all three common formats (Avro, Protobuf, JSON Schema) because compatibility semantics differ — Protobuf's field-number-based resolution tolerates renames that Avro's name-based resolution rejects without aliases, and JSON Schema's `additionalProperties` interacts with FORWARD compatibility differently. Each fixture should carry a `expectedCompatibilityResult` field so the checker's output can be validated against ground truth, and a `breakingChangeReason` string for the UI to display as teaching copy.

For timeline realism, stagger `registeredAt` timestamps over months with clusters around "incidents" (a breaking change followed rapidly by a rollback version), and tag versions with synthetic producer/consumer deployment metadata so the UI can show which consumers would break if pinned to an older version when a new one is registered.
