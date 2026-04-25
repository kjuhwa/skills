---
version: 0.1.0-draft
name: opensre-tool-registry-surfaces
summary: OpenSRE auto-discovers ~60 investigation tools by walking app.tools/, deduping by name, and tagging each with a "surface" (investigation vs chat) so the same module can appear in different agent contexts with different visibility.
category: registry
tags: [tool-registry, auto-discovery, surfaces, plugin]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/tools/registry.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# OpenSRE Tool Registry & Surfaces

## What it is
A canonical registry that loads tools from every submodule under `app/tools/` (one tool per module, by convention) and exposes them via two interfaces:

- `get_registered_tools(surface=None)` — full snapshot or filtered list.
- `get_registered_tool_map(surface=None)` — dict by name.

`Surface` is a simple Literal: `"investigation"` (default) or `"chat"`. The investigation pipeline asks for `"investigation"` tools; the chat agent asks for `"chat"` tools. Tools can opt into both surfaces.

## Discovery
- `pkgutil.iter_modules(tools_package.__path__)` enumerates all submodules.
- `_SKIP_MODULE_NAMES` excludes infrastructure (`base`, `registry`, `registered_tool`, `tool_decorator`, `utils`, `simple_tools`) and any `*_test` modules.
- Each module is imported; `inspect.getmembers` finds objects marked with `__opensre_registered_tool__` (decorator footprint) or any `BaseTool` subclass/instance.
- Snapshot is `@lru_cache`-cached; `clear_tool_registry_cache()` forces re-discovery.

## Backwards compatibility shim
A `_LEGACY_CHAT_TOOL_NAMES` set lists tool names that historically appeared in the chat agent without explicitly declaring `surfaces`. New tools should declare via the decorator's `surfaces=("investigation","chat")` param.

## Why two surfaces
- Chat agent gets a small, conversational tool subset (Tracer data lookup, GitHub code search, Sentry issues).
- Investigation pipeline gets the firehose: every observability backend, every cloud provider, every database.
- Same module, same `BaseTool` subclass — different exposure surfaces per consumer.

## Action prioritization
`get_prioritized_actions(sources, keywords)` scores each action: +2 if its `source` matches a known source, +N for each keyword present in its `use_cases`. Ties broken by name. This is how the planner narrows 60 tools down to 5–10 candidates per loop.
