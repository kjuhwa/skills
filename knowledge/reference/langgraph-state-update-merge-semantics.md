---
version: 0.1.0-draft
name: langgraph-state-update-merge-semantics
summary: LangGraph nodes return partial dicts that the framework merges into state. OpenSRE's _merge_state helper shows the convention: messages are appended (not replaced), other keys overwrite — useful for replicating LangGraph behaviour outside a graph (testing, CLI runners).
category: reference
tags: [langgraph, state, merge, conventions]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/pipeline/runners.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# LangGraph State Update Merge Semantics

## The convention
A LangGraph node receives the full state and returns a *partial* dict. LangGraph merges that dict into state with two distinct rules:

- **`messages`** — append-only. The returned value (single message or list) is concatenated to the existing list.
- **All other keys** — overwrite.

This is configurable via Annotated reducers (e.g. `Annotated[list, operator.add]`), but the default convention is what most LangGraph tutorials use.

## Why this matters
Outside the graph (CLI runners, unit tests), you sometimes need to replay node behaviour without spinning up the full StateGraph. A small helper replicates the merge:

```python
def _merge_state(state, updates):
    if not updates: return
    for key, value in updates.items():
        if key == "messages":
            messages = list(state.get("messages", []))
            messages.extend(value) if isinstance(value, list) else messages.append(value)
            state["messages"] = messages
            continue
        state[key] = value
```

## Implications for node design
- Returning `{}` is a no-op (state unchanged).
- Returning `{"messages": [new_msg]}` adds a message; `{"messages": "string"}` would NOT append a string but replace (most reducers wrap singletons), so always pass a list.
- Returning a key with `None` overwrites to None — careful with optional fields.
- Consider returning `{"masking_map": ctx.to_state()}` etc. so masking placeholders persist; just remember they overwrite, so always serialize the full map.

## Reference
- LangGraph reducers docs: https://langchain-ai.github.io/langgraph/concepts/low_level/#reducers
- For chat-message accumulators, prefer `langgraph.graph.message.add_messages` over manual list management.
