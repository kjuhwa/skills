---
name: Polymorphic metadata persisted as BSON via enum-switch deserialization
description: Store heterogeneous domain payloads under one field as raw Document, then deserialize with Gson chosen by an enum discriminator
type: knowledge
category: arch
confidence: high
source:
  kind: project
  ref: lucida-topology@8729ca3
tags: [polymorphism, bson, gson, mongodb, discriminator, content-type]
---

# Polymorphic metadata persisted as BSON via enum-switch deserialization

## Fact
Topology entities (map, node, edge, group-node, text-label, figure, dummy-node) share one
storage shape but carry type-specific visualization data. Instead of a class hierarchy mapped
by Spring Data, the project stores the payload as a raw BSON `Document` field and deserializes
it in application code using a `switch` on an enum discriminator (`ContentsType`) via Gson.

## Shape
- A `contentsType` enum field on every row acts as the discriminator.
- The variable payload is stored as `org.bson.Document` (or `Map<String,Object>`) — schemaless
  at the driver level.
- A single deserializer switches on `contentsType` and calls `gson.fromJson(doc.toJson(), ...)`
  into the concrete subtype (`MapMetadata`, `NodeMetadata`, etc., all extending `AbstractMetadata`).
- Writes go the reverse direction: serialize the concrete subtype to JSON, parse into `Document`,
  save.

## Why chosen (over Spring Data's `_class` discriminator)
- Keeps BSON documents portable: no `_class` string tying them to a Java package.
- Lets non-Java consumers (frontend editor, exports, other services) read the document without
  knowing Java types.
- Survives refactors / package renames without a data migration.

## Counter / Caveats
- Loss of type safety at persistence boundary: adding a new `ContentsType` without updating the
  switch silently drops the payload. Mitigate with an exhaustive switch + default that throws.
- Gson ↔ BSON round-trip is lossy for dates, decimals, binaries. Restrict metadata fields to
  plain JSON-compatible types, or register type adapters.
- Two serializers in the stack (Spring Data for the wrapper, Gson for the payload) means two
  places to configure null handling, naming strategy, unknown-field policy. Keep them aligned.

## Evidence
- `CLAUDE.md` — "Metadata Polymorphism" section.
- `src/main/java/com/nkia/lucida/topology/entity/metadata/` — `AbstractMetadata` plus concrete subtypes.
- `ContentsType` enum in the entity layer.
