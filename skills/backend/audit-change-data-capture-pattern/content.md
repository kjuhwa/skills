# Audit Change-Data Capture Pattern

For an UPDATE event on object `objectId`:

1. Load the **previous** snapshot from storage (by `objectId`, before the update is committed).
2. Receive the **after** snapshot from the caller/Kafka event.
3. Compute two diffs:
   - `changedPrev` — values that existed **before** (what changed FROM)
   - `changedAfter` — values that exist **after** (what changed TO)

## Correct shape

```java
Map<String, Object> changedPrev  = new LinkedHashMap<>();
Map<String, Object> changedAfter = new LinkedHashMap<>();

// Iterate the BEFORE doc; compare to AFTER doc
for (String key : beforeDoc.keySet()) {
    Object b = beforeDoc.get(key);
    Object a = afterDoc.get(key);
    if (!Objects.equals(b, a)) {
        changedPrev.put(key, b);   // old value
        changedAfter.put(key, a);  // new value
    }
}
// Also pick up NEW keys added in afterDoc:
for (String key : afterDoc.keySet()) {
    if (!beforeDoc.containsKey(key)) {
        changedPrev.put(key, null);
        changedAfter.put(key, afterDoc.get(key));
    }
}
```

## Why this exact shape

A common bug (fixed in lucida-audit commit bd4dc66): iterating `afterDoc` and putting `afterDoc.get(key)` into `changedPrev` silently **reverses** the diff. Auditors then read the trail backward and believe the wrong direction of change.

Rule: **`changedPrev[k]` must come from the before-snapshot. Always.** Add a unit test that asserts `prev != after` for a trivial field change.

## Related

- `audit-changed-prev-after-field-swap-bug` — knowledge entry with the original bug evidence.
