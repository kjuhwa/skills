---
name: sse-stream-parser-langgraph-events
description: Parse a LangGraph /runs/stream SSE response into typed StreamEvent objects, extracting node name from both updates-mode (top-level key) and events-mode (metadata.langgraph_node), with run_id and tags surfaced.
category: observability
version: 1.0.0
version_origin: extracted
tags: [sse, langgraph, streaming, httpx]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/remote/stream.py
imported_at: 2026-04-18T00:00:00Z
---

# SSE Stream Parser for LangGraph Events

## When to use
You're consuming a LangGraph hosted server's `/runs/stream` endpoint over httpx and want a uniform `StreamEvent` shape for both `stream_mode: ["updates"]` (node-completion granularity) and `stream_mode: ["events"]` (per-token / per-tool granularity), so the same renderer code works for both.

## How it works
- `parse_sse_stream(response)` consumes `response.iter_lines()`, accumulating `event:` and `data:` fields and yielding when a blank line terminates a frame.
- `_extract_node_name` looks for the node name in the right place per mode: `data` top-level keys for `updates`, `metadata.langgraph_node` for `events`.
- For `events` mode, also extract `event` (callback kind), `run_id`, and `tags` so the renderer can highlight specific frames.

## Example
```python
@dataclass
class StreamEvent:
    event_type: str
    data: dict[str, Any] = field(default_factory=dict)
    node_name: str = ""
    timestamp: float = field(default_factory=time.monotonic)
    kind: str = ""
    run_id: str = ""
    tags: list[str] = field(default_factory=list)

def parse_sse_stream(response: httpx.Response) -> Iterator[StreamEvent]:
    current_event_type = ""; data_lines = []
    for line in response.iter_lines():
        if line.startswith("event:"):
            current_event_type = line[6:].strip(); data_lines = []
        elif line.startswith("data:"):
            data_lines.append(line[5:].strip())
        elif line == "":
            if current_event_type and data_lines:
                yield _build_event(current_event_type, "\n".join(data_lines))
                current_event_type = ""; data_lines = []
    if current_event_type and data_lines:
        yield _build_event(current_event_type, "\n".join(data_lines))

def _extract_node_name(event_type, data):
    if event_type == "updates" and isinstance(data, dict):
        keys = [k for k in data if not k.startswith("__")]
        if len(keys) == 1: return keys[0]
    if isinstance(data, dict):
        md = data.get("metadata", {})
        if isinstance(md, dict) and "langgraph_node" in md:
            return str(md["langgraph_node"])
        if "name" in data: return str(data["name"])
    return ""
```

## Gotchas
- Always handle the trailing-frame case (no blank line after the final event); the example above does this with the post-loop `if current_event_type and data_lines`.
- Wrap `json.loads` in try/except — provider servers occasionally emit a malformed frame on shutdown.
- LangGraph's `__interrupt__` / `__metadata__` keys start with `__`; filter those out when looking for the actual node name in updates mode.
