---
name: hermes-self-registering-tool-registry
description: Build an LLM tool registry where each tool file calls registry.register() at import so discovery is automatic.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, tool-use, registry, python, plugins]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Self-Registering LLM Tool Registry

## Context

When an agent has dozens or hundreds of tools (hermes-agent has 90+), a centralized `TOOLS = [...]` list becomes a merge-conflict hotspot and forgets to stay in sync with schemas. Hermes' pattern avoids a manual import list entirely: each tool file declares itself at import time.

## When to use

- You have >10 tools and want new tools addable by dropping a single file.
- You want one source of truth for `{schema, handler, check_fn, requires_env, toolset}`.
- You need toolset-level availability checks (API key present, library installed, etc.).
- You want MCP / plugin tools to coexist with built-ins without shadowing them.

## Procedure

### 1. A registry module with NO upward deps

`tools/registry.py` must import nothing from tool files or the agent runtime. See `tools/registry.py:1-15` for the full import-chain rationale.

```python
# tools/registry.py
class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolEntry] = {}
        self._toolset_checks: Dict[str, Callable] = {}
        self._lock = threading.RLock()

    def register(self, name, toolset, schema, handler,
                 check_fn=None, requires_env=None, is_async=False,
                 emoji="", max_result_size_chars=None):
        with self._lock:
            existing = self._tools.get(name)
            if existing and existing.toolset != toolset:
                both_mcp = (existing.toolset.startswith("mcp-")
                            and toolset.startswith("mcp-"))
                if not both_mcp:
                    logger.error("Tool registration REJECTED: %r would shadow %r",
                                 name, existing.toolset)
                    return  # reject shadowing
            self._tools[name] = ToolEntry(...)
            if check_fn and toolset not in self._toolset_checks:
                self._toolset_checks[toolset] = check_fn

registry = ToolRegistry()  # module-level singleton
```

### 2. Tools self-register at import time

Each `tools/*.py` calls `registry.register(...)` at module top level (`tools/process_registry.py:1199-1205`, `tools/skills_tool.py`, etc.). Handlers MUST return a JSON string — helpers `tool_error()` and `tool_result()` eliminate the `json.dumps({"error": ...})` boilerplate (`tools/registry.py:456-482`).

```python
from tools.registry import registry, tool_error, tool_result

def my_handler(args, **kw):
    if not args.get("query"):
        return tool_error("query required")
    return tool_result(success=True, data=...)

registry.register(
    name="my_tool", toolset="search",
    schema={...}, handler=my_handler,
    check_fn=lambda: bool(os.getenv("SEARCH_API_KEY")),
    requires_env=["SEARCH_API_KEY"],
)
```

### 3. AST-gated auto-discovery

`discover_builtin_tools()` (`tools/registry.py:56-73`) globs `tools/*.py`, parses the AST, and **only imports files that contain a top-level `registry.register(...)` call**. Files with `register()` inside a function body (helper modules) are skipped. This prevents accidentally importing — and thus side-effecting — helper modules:

```python
def _is_registry_register_call(node: ast.AST) -> bool:
    if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call):
        return False
    func = node.value.func
    return (isinstance(func, ast.Attribute)
            and func.attr == "register"
            and isinstance(func.value, ast.Name)
            and func.value.id == "registry")

def _module_registers_tools(module_path: Path) -> bool:
    tree = ast.parse(module_path.read_text(encoding="utf-8"))
    return any(_is_registry_register_call(stmt) for stmt in tree.body)
```

### 4. Snapshot reads, locked writes

MCP refresh can mutate the registry mid-read. All reads go through `_snapshot_state()` which copies under `_lock`, so iterators never see a torn state. See `tools/registry.py:112-123`.

### 5. Lazy availability (`check_fn`)

`get_definitions(tool_names)` calls each tool's `check_fn()` once per request and caches the result per-call (`tools/registry.py:258-286`). A missing API key silently drops the tool from the schemas sent to the LLM — the model never sees unusable tools.

### 6. Dispatch with uniform error wrapping

```python
def dispatch(self, name, args, **kwargs):
    entry = self.get_entry(name)
    if not entry:
        return json.dumps({"error": f"Unknown tool: {name}"})
    try:
        if entry.is_async:
            return _run_async(entry.handler(args, **kwargs))
        return entry.handler(args, **kwargs)
    except Exception as e:
        return json.dumps({"error": f"Tool execution failed: {type(e).__name__}: {e}"})
```

Every tool error reaches the LLM as a consistent JSON shape.

## Pitfalls

- **Never call `registry.register()` from inside a function** — the AST gate skips your file.
- **Do not have tool modules import `model_tools`** — that flips the dependency direction and breaks the circular-import guarantee. The chain is strictly `registry ← tools/*.py ← model_tools.py ← run_agent.py`.
- **Tool schema descriptions must not hardcode cross-toolset tool names** — those tools may be unavailable at runtime and the model will hallucinate calls. See `AGENTS.md` pitfall "DO NOT hardcode cross-tool references" — add such hints dynamically in `get_tool_definitions()` instead.
- **Deregister cascades matter.** When MCP `notifications/tools/list_changed` fires, you must drop both the tool AND its toolset check if it was the last tool in that toolset (`tools/registry.py:229-252`).
