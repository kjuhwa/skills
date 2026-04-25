---
version: 0.1.0-draft
name: priority-lower-is-higher-stable-sort
summary: Common registry pitfall — priority numbers where 0 = highest (tried first), 10 = lowest. Pick one convention, document it loudly, and combine with stable sort so insertion order breaks ties.
category: architecture
confidence: medium
tags: [architecture, registry, priority, stable-sort, pitfall]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
---

# Priority convention: lower value = tried first + stable sort for tie-breaking

Registries with a `priority` field on each entry run into two decisions that trip up plugin authors:

1. **Direction.** Is `priority=0` "highest priority" (tried first) or "lowest priority" (tried last)?
2. **Tie-breaking.** When two entries share a priority, who wins?

Markitdown's stated answer:

> By default, most converters get priority `PRIORITY_SPECIFIC_FILE_FORMAT` (== 0). The exception is the PlainTextConverter, HtmlConverter, and ZipConverter, which get priority `PRIORITY_GENERIC_FILE_FORMAT` (== 10), with **lower values being tried first** (i.e., higher priority).
>
> Just prior to conversion, the converters are sorted by priority, using a **stable sort**. This means that converters with the same priority will remain in the same order, with the most recently registered converters appearing first.

## Why "lower = first" is actually readable

The semantic here is "position" or "rank", not "importance":

- Specific format match → **rank 0** (goes at the front)
- Generic format match → **rank 10** (goes near the back)

Think of it like CSS `z-index` inverted, or database query-plan cost — low numbers win. Compared to "higher = more important," neither is objectively better; what matters is that you pick one, document it, and never change it.

## The stable-sort tie-breaker

```python
sorted_registrations = sorted(self._converters, key=lambda x: x.priority)
```

Python's `sorted` is stable. If entries A and B share a priority, their output order matches input order. Combined with `insert(0, ...)` on every registration — meaning the newest registration goes to the front of the *input* list — the newest entry wins any tie.

This is what lets plugins shadow built-ins without an unregister API:

```python
# Built-in is registered at priority 0 (specific format).
host.register_converter(BuiltinPdfConverter())     # input: [Builtin]
# Plugin registers its own PDF handler, also at priority 0.
host.register_converter(MyPdfConverter())           # input: [MyPdf, Builtin]
# Stable sort keeps [MyPdf, Builtin] order; MyPdf runs first.
```

## Pitfalls to avoid

### Pitfall 1: reversing the convention halfway through

Someone adds a new entry with "I'll give this a priority of 100 so it runs first" — and now it's last. Or they add a third convention ("negative = first") for a special edge case. Pick one and enforce it in code review. Constants like `PRIORITY_SPECIFIC = 0` / `PRIORITY_GENERIC = 10` make the convention visible at every call site.

### Pitfall 2: using `heapq` or an unstable sort

`heapq.heappush` is *not* stable; it breaks ties arbitrarily. `sorted()` is stable on CPython (guaranteed since 2.2). If you must use a heap for performance, include a monotonic sequence number as secondary key:

```python
@dataclass
class Registration:
    priority: float
    seq: int               # monotonic counter, descending for "newest first"
    converter: ...

heapq.heappush(reg_heap, (reg.priority, -reg.seq, reg))
```

### Pitfall 3: caching the sorted list

Markitdown re-sorts on *every* dispatch call. Tempting to cache — it's a tiny list, but priorities can theoretically change at runtime, and the sort is O(n log n) on a very small n (typically <30). Re-sorting is cheaper than the bug that would happen if something slipped past the cache invalidation.

### Pitfall 4: `append()` instead of `insert(0, ...)`

Append means the *oldest* registration wins ties — the opposite of what plugin authors expect. Insert-at-head gives newest-wins, which matches every plugin override pattern in the wild.

## Documentation checklist

If your project uses this pattern, the registry module's docstring should say, explicitly:

1. "Priority is a float; lower values are tried first (higher priority)."
2. "At equal priority, the most recently registered entry wins."
3. "Use `PRIORITY_SPECIFIC_*` and `PRIORITY_GENERIC_*` constants instead of raw numbers."

One paragraph, at the top of the file, visible in every IDE tooltip.

## Related

- `document-converter-priority-registry` skill — the full pattern this knowledge entry annotates.
- Alternatives: priority queues (heapq) with monotonic-counter tiebreaker; ordered dicts; explicit position-insertion API (`register_after(name, ...)`).
