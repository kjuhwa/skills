---
name: evidence-truncation-with-totals
description: Cap LLM-bound evidence (logs, traces, metrics) by truncating list length AND each message length, attaching count_total fields when truncation occurs so the model knows it's seeing a sample.
category: observability
version: 1.0.0
version_origin: extracted
tags: [llm-context, truncation, evidence, compaction]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/tools/utils/compaction.py
imported_at: 2026-04-18T00:00:00Z
---

# Evidence Truncation with Total Counts

## When to use
Evidence dicts going into a prompt have unbounded list fields (logs, traces, metrics, datapoints, spans). You want a single shared helper that imposes a default cap, lets callers override, AND surfaces the original count so the model isn't blind to dropped data.

## How it works
- One `truncate_list` helper for raw lists.
- `truncate_message` clips long strings with `"..."`.
- `compact_logs(logs, limit, max_chars)`, `compact_traces(traces, limit, max_spans_per_trace)`, `compact_metrics(metrics, limit, max_datapoints)`, `compact_invocations(...)` — one per evidence shape, each adding a `<key>_total` sibling field whenever a list got chopped, e.g. `spans_count_total: 312` next to `spans: [...50 items]`.
- A `summarize_counts(total, returned, item_name)` helper returns a one-line summary string when truncation happened, useful for prompt context.

## Example
```python
DEFAULT_LOG_LIMIT = 50
DEFAULT_MESSAGE_CHARS = 1000

def truncate_message(message: str, max_chars: int = DEFAULT_MESSAGE_CHARS) -> str:
    return message if len(message) <= max_chars else message[:max_chars - 3] + "..."

def compact_traces(traces, limit=None, max_spans_per_trace=50):
    truncated = list(traces)[:(limit or DEFAULT_TRACE_LIMIT)]
    out = []
    for trace in truncated:
        compacted = dict(trace)
        if "spans" in compacted and isinstance(compacted["spans"], list):
            original = len(trace.get("spans", []))
            compacted["spans"] = compacted["spans"][:max_spans_per_trace]
            if original > max_spans_per_trace:
                compacted["span_count_total"] = original
        out.append(compacted)
    return out

def summarize_counts(total: int, returned: int, item_name="items") -> str | None:
    return f"Showing {returned} of {total} {item_name}" if total > returned else None
```

## Gotchas
- Always emit the `<key>_total` field — if the LLM only sees 50 logs without context, it will conclude the failure was small. With "of 1240" it asks for more.
- Trim message bodies BEFORE truncating the list so a list of huge messages doesn't blow the prompt budget.
- Default char cap (1000) is arbitrary; tune per provider context size.
