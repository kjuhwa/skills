---
version: 0.1.0-draft
name: port-out-no-optional-raise-in-adapter
description: In hexagonal codegen, single-record lookups should raise a domain exception inside the Adapter rather than return `Optional<T>` from the Port-Out interface
category: arch
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: medium
linked_skills: []
tags: [hexagonal, port-out, optional, exception-handling, error-code]
---

**Fact:** For single-entity fetches in a hexagonal layout, two designs compete:
1. `Optional<T> findById(...)` on the Port-Out, with the Service unwrapping and throwing.
2. `T findById(...)` on the Port-Out, with the Adapter throwing a domain exception (module-specific `{Module}ErrorCode`) on miss.

The project picks (2). Reasoning: the "not found" case is a domain concern with a stable error code, so the exception belongs at the persistence boundary where the miss is first detected. Services consume a happy-path return type and don't repeat null/Optional handling on every call site. This also keeps the Port-Out interface expressing domain intent ("give me X") rather than persistence uncertainty.

**Why:** `Optional` at the port layer pushes miss-handling boilerplate into every Service method and leaks a persistence concern (the row might be missing) into domain logic. Module-specific error codes (not a generic shared `*_ERROR`) make failures traceable and API responses precise.

**How to apply:**
- In hexagonal codegen templates, generate `T findById(...)` signatures and have the Adapter call `.orElseThrow(() -> new {Module}Exception({Module}ErrorCode.XXX_NOT_FOUND))`.
- Require every module to own a `{Module}ErrorCode` enum; reject generic/shared error codes in reviews.
- Multi-record lookups (lists, pages) still return collections — the rule is specifically about single-record misses.
- If a caller genuinely needs "absent is fine", expose a separate `existsById` / `findOptional` method with a distinct name — don't overload the main fetcher.

**Evidence:**
- Internal BE project rules §core-principles #8, #9.
- Project CLAUDE.md BE principles — codified as principles 8 and 9.
