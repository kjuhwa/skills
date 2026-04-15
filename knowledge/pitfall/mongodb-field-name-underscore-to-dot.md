---
name: mongodb-field-name-underscore-to-dot
category: pitfall
summary: |
  Some MongoDB/Spring Data response-mapping paths silently convert underscores in dynamic field
  names into dots, turning "user_id" into a nested path "user.id". Search endpoints that return
  Map<String, Object> are especially vulnerable.
source:
  kind: project
  ref: lucida-snote
---

# Pitfall: underscore-to-dot rewriting in MongoDB field-name responses

## Fact
When a Spring + MongoDB endpoint serializes dynamic field names out of a `Map<String, Object>` (e.g. a generic search result), a mapping layer can convert `_` in keys to `.`, flattening `user_id` into a nested `{"user": {"id": ...}}` structure on the wire. Consumers then fail to find the expected flat `user_id` key and receive silently reshaped data.

## Why
This bit the search controller in lucida-snote repeatedly across several commits (the fix had to be re-applied after refactors) — whatever mapping step is at fault is not obvious from the controller code, which just returns what Mongo gave it. The symptom is a subtle response-shape change rather than an error, so it slips through unit tests that check types but not key names.

## How to apply
- For any endpoint that returns dynamic/user-defined field names from Mongo (search hits, ad-hoc query results, aggregation output), add an integration test that sends a document with `_` in the field name and asserts the response preserves it verbatim.
- Consider normalizing field names at write time (forbid `_` in user-defined keys) if the mapping layer can't be turned off.
- When reviewing PRs that touch search or generic projection endpoints, look for `Map<String, Object>` return types and ask whether the mapping preserves keys exactly.
- If you hit the symptom, don't patch the controller surface — trace through the serializer/converter chain to the component that's doing the rewrite and disable it there; otherwise the fix gets reverted by the next refactor.
