---
version: 0.1.0-draft
name: hermes-tool-schema-no-cross-toolset-references
summary: Why tool schemas must never hardcode other tool names — unavailable tools cause model hallucination.
category: decision
tags: [llm-agents, tool-schemas, hallucination, toolsets]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Tool Schemas Must Not Reference Other Tools By Name

## The anti-pattern

```python
# BAD — in browser_tool.py
{
    "name": "browser_navigate",
    "description": (
        "Navigate browser to URL. "
        "For simple keyword lookups, prefer web_search instead."
    )
}
```

## Why it breaks

`web_search` may not be available at runtime — the user has no Parallel/Firecrawl API key, or the `web` toolset is disabled. The model sees:
- Instruction in its context: "prefer `web_search`"
- `web_search` is NOT in the tool list

Result: the model calls `web_search` anyway, triggering the "Unknown tool" error path. Or worse, the model fabricates tool-call arguments that look right but hit nothing.

This was the source of real bugs in Hermes, documented in `AGENTS.md` pitfalls.

## The right pattern

Add cross-references **dynamically**, after you know which tools actually resolved. `model_tools.py` post-processes schemas in `get_tool_definitions()`:

```python
# Pseudocode of the pattern in model_tools.py
def get_tool_definitions(enabled_toolsets, ...):
    schemas = registry.get_definitions(tool_names_from_enabled_toolsets)
    resolved = {s["function"]["name"] for s in schemas}

    # Post-process: inject cross-references only for tools actually present
    for schema in schemas:
        name = schema["function"]["name"]
        if name == "browser_navigate" and "web_search" in resolved:
            schema["function"]["description"] += (
                " For simple keyword lookups, prefer `web_search` instead."
            )
        if name == "execute_code" and "terminal" in resolved:
            ...
    return schemas
```

The browser_navigate / execute_code post-processing blocks in `model_tools.py` are the canonical implementation.

## The general principle

Tool schemas are part of the prompt. Anything in a schema description is an instruction the model follows. Instructions must not reference resources the model can't access — that's how hallucinations start.

## Adjacent rules

- **Don't name models or providers in descriptions.** "Works best with Claude" is meaningless when the user is running Llama.
- **Don't reference config keys in descriptions.** "Set `browser.viewport` first" — the model has no tool to read config; it will try to invent one.
- **Keep descriptions under ~200 chars when possible.** Long descriptions bloat the system prompt, which hurts cache + cost + attention.
- **Parameter descriptions can and should be specific** — that's where most of the behavior-shaping should happen.

## Verification

A simple linter check: for each `registry.register(...)` call, extract the description and search for any other registered tool name in it. Flag matches as candidates for dynamic injection.

## Reference

- `AGENTS.md` pitfalls section on "DO NOT hardcode cross-tool references"
- `model_tools.py` `get_tool_definitions()` — where dynamic injection lives
