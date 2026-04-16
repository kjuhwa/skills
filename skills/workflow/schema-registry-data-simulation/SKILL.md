---
name: schema-registry-data-simulation
description: Synthesizing realistic Avro/Protobuf subject fixtures with believable evolution histories
category: workflow
triggers:
  - schema registry data simulation
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-data-simulation

Static JSON fixtures for schema registry demos collapse without realistic evolution chains. Generate subjects with **3–8 versions** each, where each version applies one plausible mutation: add-optional-field (most common, ~50%), add-required-field-with-default (~15%), remove-deprecated-field (~10%), widen-type (int→long, ~10%), narrow-enum (~5%), rename-via-alias (~5%), and a rare truly-breaking change (~5%) that should show as red in the matrix. Weight the mix so BACKWARD-compatible evolutions dominate, mirroring real Kafka shops where producers upgrade before consumers.

Seed subject names from real patterns: `<domain>-<entity>-value` and `<domain>-<entity>-key` pairs (e.g., `orders-order-value`, `payments-transaction-value`), plus CDC-style `dbserver.schema.table-value` for Debezium-flavored fixtures. Each fixture should include a registry-assigned monotonic `schemaId` (global counter across subjects, not per-subject), a `version` (per-subject, starting at 1), and a `references[]` array for a subset of subjects to exercise the nested-schema case that commonly breaks naive tree renderers. Generate compatibility mode transitions too — start subjects at BACKWARD, have ~20% switch to FULL after version 3, and a few downgrade to NONE to demonstrate "why was this breaking change allowed?" scenarios.

For the matrix, pre-compute the reader×writer compatibility result using the declared mode rather than re-deriving it in the UI, and cache as a sparse map keyed by `(readerVersion, writerVersion)` — full N×N is wasteful when only the current mode's direction matters. Include a deliberate "surprise" pair per subject where an apparently-safe add-field is incompatible because the field's default value fails the reader's schema validation, since this is the canonical gotcha worth teaching.
