# Length-capped identifier with hash suffix

## Problem
External systems impose length caps on identifiers: MCP tool names (~40–64 chars), Kubernetes labels (63), DNS labels (63), some DB column names (30). Naive truncation causes collisions (`really_long_name_a` and `really_long_name_b` both truncate to `really_long_name`). Full hashing loses human readability.

## Pattern
Keep a readable prefix, append `_<shortHashOfFullName>`. The hash preserves uniqueness; the prefix preserves legibility.

```java
static String shorten(String name, int maxLen) {
  if (name == null || name.length() <= maxLen) return name;
  String hash = sha1Hex(name).substring(0, 6);   // 6 hex chars ≈ 24 bits
  int keep = maxLen - 1 - hash.length();         // room for '_' + hash
  if (keep < 1) keep = Math.max(0, maxLen - hash.length());
  return name.substring(0, Math.min(keep, name.length())) + "_" + hash;
}
```

Properties:
- **Deterministic**: same input → same output across runs and processes.
- **Idempotent for short names**: names already within the cap pass through untouched.
- **Collision-resistant**: 24-bit suffix keeps collision probability ≤ 10⁻⁴ well past 100 active names.

## When to use
- You are generating identifiers from user data (file names, API paths, tag names) that may exceed a downstream cap.
- You need a stable identifier — regenerating from the same source must always yield the same short form so clients can cache it.
- You don't control the downstream cap (can't widen it).

## When NOT to use
- You control the identifier scheme end-to-end and can use UUIDs or numeric IDs.
- You need cryptographic collision resistance (use full SHA-256, not 24 bits).
- The downstream system is case-insensitive and you're using hex — mix `a–z0–9` to reduce collisions per char.

## Pitfalls
- **Don't use `hashCode()` as fallback**: Java's `String.hashCode()` has known collisions on small ASCII inputs and is not stable across JVM versions in principle. Use SHA-1 or xxHash.
- **Sanitize the prefix too**: if the target charset is `[a-z0-9_]`, lowercase and regex-replace before truncating, or the hash suffix won't save you from a "invalid character" rejection.
- **Bump hash length at scale**: 6 chars is fine for hundreds of names; at millions, birthday collisions become real — go to 10+ hex chars.
- **Log the mapping once** when truncation fires so debugging doesn't require recomputing the hash from the long name.
