---
version: 0.1.0-draft
name: function-schema-generation
summary: How @function_tool generates JSON schemas from Python function signatures, docstrings, and Pydantic models for LLM tool calling.
category: llm-agents
confidence: high
tags: [openai-agents, function-tool, json-schema, pydantic, type-hints]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: src/agents/function_schema.py, src/agents/tool.py
imported_at: 2026-04-18T00:00:00Z
---

# Function Schema Generation

## How @function_tool Works

The `@function_tool` decorator (or `function_tool()` function) introspects a Python function to produce:
1. A JSON schema for the LLM (tool parameters)
2. A wrapper that parses LLM-provided JSON arguments and calls the function

The schema is derived from:
- **Type hints** — mapped to JSON Schema types
- **Docstring** — used as the tool description (Google, NumPy, or reStructuredText style)
- **`Annotated[type, "description"]`** — per-parameter description
- **Default values** — mark parameters as optional in schema
- **Pydantic models** — complex parameter or return types auto-schema-generated

## Type Mapping

| Python type | JSON Schema |
|---|---|
| `str` | `{"type": "string"}` |
| `int` | `{"type": "integer"}` |
| `float` | `{"type": "number"}` |
| `bool` | `{"type": "boolean"}` |
| `list[str]` | `{"type": "array", "items": {"type": "string"}}` |
| `dict[str, Any]` | `{"type": "object"}` |
| `BaseModel` | Pydantic's JSON schema |
| `Literal["a","b"]` | `{"type": "string", "enum": ["a","b"]}` |
| `Optional[str]` | `{"anyOf": [{"type": "string"}, {"type": "null"}]}` |

## Parameter Description via Annotated

```python
from typing import Annotated
from agents import function_tool

@function_tool
def search(query: Annotated[str, "The search query."], max_results: int = 5) -> str:
    """Search the knowledge base."""
    ...
```

`max_results` is optional in the schema because it has a default value.

## First Parameter Context Detection

If the first parameter is typed as `RunContextWrapper[T]` or `ToolContext`, it is excluded from the JSON schema (the LLM does not provide it; the SDK injects it at call time).

## Strict Schema

By default, the SDK enforces strict JSON schema (`additionalProperties: false`, all required fields listed). This improves reliability with OpenAI models that support strict mode.

To disable: `@function_tool(strict_mode=False)`.

## Async Support

Both sync and async functions work identically with `@function_tool`. The decorator handles the async/sync distinction internally.

## Source paths
- `src/agents/function_schema.py` — core schema generation logic
- `src/agents/tool.py` — function_tool decorator, FunctionTool class
- `src/agents/strict_schema.py` — strict JSON schema enforcement
