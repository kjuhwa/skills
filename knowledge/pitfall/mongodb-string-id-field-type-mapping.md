---
version: 0.1.0-draft
tags: [pitfall, mongodb, string, field, type, mapping]
name: mongodb-string-id-field-type-mapping
description: Spring Data MongoDB coerces 24-char-hex @Id String values to ObjectId unless @Field(targetType = FieldType.STRING) is set
category: pitfall
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# Spring Data MongoDB silently coerces String @Id to ObjectId

**Fact.** A `@Id private String id;` on a `@Document` entity looks fine, but when the stored value happens to parse as a 24-hex-char ObjectId, Spring Data MongoDB writes/reads it as `ObjectId`, not `String`. Cross-collection lookups by id then miss because one side stored a string and the other an ObjectId.

**Why:** `MappingMongoConverter` inspects the value's shape, not the Java type, when choosing the BSON type. The fix is to declare the storage type explicitly.

**How to apply.**
- Any entity with `@Id String id` that can hold hex-shaped tokens (SQL hashes, digest ids, external keys) must add `@Field(targetType = FieldType.STRING)` on the id field.
- If a collection already has mixed types, you have to rewrite in place (`$type` check + `$toString`) — no way to make Spring read both transparently.
- Default to this annotation on every `String @Id` in new entities; cost is zero, silent-bug risk is high.

**Evidence.**
- `git log`: `5cf80047` and `589933f8 MongoDB _id 타입 String인 경우 @Field(targetType = FieldType.STRING) 필드 추가`
- affected entities: text-info / plan-info documents keyed by hashed SQL identifiers.
