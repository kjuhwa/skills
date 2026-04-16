---
name: schema-registry-data-simulation
description: Generate realistic synthetic schema registry data covering multi-format subjects, version histories, and compatibility check results.
category: workflow
triggers:
  - schema registry data simulation
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-data-simulation

Schema registry simulations need three distinct data shapes. For the **subject catalog**, model each entry with `{id, subject, version, type, compat, schema}` where `type` is one of AVRO, JSON, or PROTOBUF and `compat` spans the full Confluent compatibility enum: NONE, BACKWARD, BACKWARD_TRANSITIVE, FORWARD, FORWARD_TRANSITIVE, FULL, FULL_TRANSITIVE. The schema payload itself must be format-aware — AVRO records use `{type:"record", name, fields:[{name,type}]}` with union types like `["null", {type:"map",values:"string"}]` for optional fields; JSON schemas use `{type:"object", properties, required}`; Protobuf uses `{syntax:"proto3", message, fields:["string sku = 1"]}`. Mixing all three formats in the same registry is realistic and tests UI rendering edge cases. Use domain-meaningful subject names following the `<entity>-<event>` convention (e.g., `order-created`, `payment-processed`, `inventory-update`).

For **version history**, generate per-subject arrays of `{v, date, fields, change}` entries that tell a realistic evolution story. Start with an "Initial schema" at v1 with a small field count, then increment through additive changes ("Added currency"), nullable wrapping ("Made metadata nullable"), and breaking renames ("Renamed discount to discountPct"). Dates should advance by 3–6 month intervals. The `fields` count drives visual sizing in timelines, so vary it from 2–5 to create meaningful visual differentiation between versions.

For the **compatibility matrix**, generate a `subjects × versions` grid where each cell is randomly assigned PASS (60%), WARN (25%), or FAIL (15%) — but only up to a `maxV` threshold per subject (2–5 versions), with cells beyond that set to `null`. This models real registries where subjects have uneven version depth. The probability distribution matters: skew heavily toward PASS to reflect a healthy registry, with WARN and FAIL as exceptions that draw attention. Use a simple `Math.random()` threshold (`r < 0.6 → PASS, r < 0.85 → WARN, else → FAIL`) for reproducible simulation without external dependencies.
