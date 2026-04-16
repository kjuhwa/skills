---
name: schema-registry-data-simulation
description: Simulating multi-version schema subjects with field evolution, compatibility levels, and temporal registration metadata for UI prototyping.
category: workflow
triggers:
  - schema registry data simulation
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-data-simulation

Schema registry data simulation requires modeling three distinct axes per subject: the version sequence (v1, v2, v3…), the field list per version (with type, name, and optional default), and the compatibility contract (FULL, FORWARD, BACKWARD, NONE). Each simulated subject should span a realistic serialization format — Avro records with union/map/array types, Protobuf messages with field numbers and enums, or JSON Schema with integer/string/array types. Versions evolve by appending optional fields with defaults (FULL-compatible), appending required fields without defaults (BACKWARD-only), removing fields (FORWARD-only), or changing field types (NONE). A good simulation includes 4–6 subjects with 1–4 versions each, covering all four compatibility levels and all three formats, so that filter and search UI paths are fully exercisable.

Temporal metadata is modeled as registration timestamps (typically year-month granularity) spread across a 12–18 month window, ensuring the timeline visualization has enough spread to show clustering patterns. Each version entry carries a field count integer and a compatibility enum. The simulation should include at least one subject with a single version (no evolution), one with rapid successive versions (3+ within 6 months), and one that transitions compatibility levels across versions (e.g. FULL → FORWARD) to stress-test color encoding in timeline views. Field definitions must use realistic domain names (userId, amount_cents, sku) rather than generic placeholders, because schema registry tooling is often validated by domain experts who judge realism.

For the compatibility checker, simulation takes the form of paired JSON objects — a "base" schema and an "evolved" schema — with pre-seeded examples covering each change type: field addition with default (FULL), field addition without default (BACKWARD), field removal (FORWARD), type change (NONE), and the identity case (no changes). The checker parses both into field maps, diffs them by name, and classifies each delta. The simulation must include fields with explicit `"default"` keys because the presence or absence of defaults is the single factor that distinguishes FULL from BACKWARD compatibility for added fields — omitting this detail produces incorrect compatibility verdicts.
