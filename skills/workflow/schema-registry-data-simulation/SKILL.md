---
name: schema-registry-data-simulation
description: Generating realistic schema registry test data including multi-version evolution histories and pairwise compatibility matrices.
category: workflow
triggers:
  - schema registry data simulation
tags:
  - auto-loop
version: 1.0.0
---

# schema-registry-data-simulation

Schema registry demos require three coordinated data layers. **Subject catalog** data needs realistic Avro-style namespaces (`com.acme.events`, `com.acme.commerce`), a mix of compatibility modes across subjects (BACKWARD for event schemas, FULL for shared-contract schemas like Order, NONE for analytics, FORWARD for billing), and field types that reflect real-world Kafka payloads: `string` IDs, `long` timestamps, `enum` status fields, `array<T>` nested collections, and `double` monetary amounts. Include 4-6 subjects with 1-7 versions each to exercise both short and long evolution histories.

**Version history** simulation must model realistic schema evolution operations in chronological order: initial creation, additive field additions (safe under BACKWARD), field type widening (`int` to `double`), deprecation-then-removal cycles (spanning 2+ versions), and enum value additions. Each version entry carries a date, a field count, and a human-readable change description. The field count should be monotonically non-decreasing for BACKWARD-compatible subjects and can fluctuate for NONE. Space version dates 2-4 months apart to reflect real registry cadence — schemas don't change weekly.

**Compatibility matrix** data is modeled as an `N×N` integer array where `compat[reader][writer]` holds 0, 1, or 2. The matrix must be realistic: the diagonal is always 2 (a version is compatible with itself), cells near the diagonal trend toward 2 (adjacent versions are usually compatible), and compatibility degrades as version distance grows. For BACKWARD-compatible subjects, the upper triangle (newer reader, older writer) should be mostly 2, while the lower triangle degrades. Pair each numeric level with a domain-specific explanation: "field removals and type changes prevent deserialization" (0), "readable with defaults; some fields will be null" (1), "all fields map correctly" (2). This asymmetry between reader and writer is the core domain concept that generic compatibility data would miss.
