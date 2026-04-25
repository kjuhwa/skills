---
version: 0.1.0-draft
name: langgraph-stream-modes-events-vs-updates
summary: LangGraph's /runs/stream supports two stream modes — "updates" (one event per node completion, fast) and "events" (every LLM token / tool call / chain step, granular). OpenSRE handles both with one StreamEvent shape.
category: reference
tags: [langgraph, streaming, sse, events]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/remote/stream.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# LangGraph Stream Modes — Updates vs Events

## "updates" mode
- One SSE event per node completion.
- `data` shape: `{node_name: {key1: ..., key2: ...}}` — single top-level key whose value is the partial state update.
- Pro: low overhead; one event per significant step.
- Con: no visibility into what's happening *inside* a node (e.g., LLM token streaming, tool invocations).

## "events" mode
- One SSE event per LangGraph callback: `on_chain_start`, `on_chat_model_start`, `on_chat_model_stream`, `on_tool_start`, `on_tool_end`, etc.
- `data` shape: `{event: "on_chat_model_stream", data: {chunk: ...}, name, run_id, tags, metadata: {langgraph_node: "..."}}`.
- Node name lives in `metadata.langgraph_node` (not at the top level).
- Pro: full granularity; can render per-token streaming and per-tool spinners.
- Con: 100x more events; client must filter aggressively.

## OpenSRE's unified handling
A single `StreamEvent` dataclass carries both shapes:
```python
@dataclass
class StreamEvent:
    event_type: str   # "events" / "updates" / "metadata" / "end"
    data: dict
    node_name: str    # extracted via _extract_node_name
    kind: str         # "on_chat_model_stream" etc, only for events mode
    run_id: str
    tags: list[str]
```

`_extract_node_name(event_type, data)` looks at top-level keys for updates mode and `metadata.langgraph_node` for events mode. Unifies the renderer.

## When to use which
- CLI investigation runner (slow, high-information events): use **events** for the spinner subtext updates ("calling DataDogLogsTool").
- Backend-to-backend pipeline (just need to know "node X done"): use **updates**.
- Debugging: enable both and compare.

## Reference
- LangGraph streaming docs: https://langchain-ai.github.io/langgraph/concepts/streaming/
- The `astream_events(version="v2")` Python SDK call yields the same shape used here.
