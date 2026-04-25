---
version: 0.1.0-draft
name: tool-categories-for-mcp-browser-server
summary: Chrome DevTools MCP partitions its tool surface into nine ordered categories — input, navigation, emulation, performance, network, debugging, extensions, in-page, memory — used for filtering, doc ordering, and runtime gating.
category: reference
confidence: high
tags: [mcp, tool-categories, taxonomy, browser-automation]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/categories.ts
imported_at: 2026-04-18T00:00:00Z
---

# MCP Browser Server Tool Categories

## Context

When a tool server grows past ~10 tools, you need a stable taxonomy for it. The categories drive (a) doc navigation, (b) the `--no-category-X` runtime toggles, (c) the order tools appear in generated reference, (d) tag-based filtering in UIs.

## The fact / decision / pitfall

Nine categories, defined in this order (the order is the presentation order in docs):

| Key          | Label                | Typical tools                                    |
|--------------|----------------------|--------------------------------------------------|
| input        | Input automation     | click, fill, hover, drag                         |
| navigation   | Navigation automation| navigate_page, new_page, list_pages, wait_for    |
| emulation    | Emulation            | set_viewport, set_user_agent, set_cpu_throttle   |
| performance  | Performance          | performance_start_trace, performance_stop_trace  |
| network      | Network              | list_network_requests, get_network_request       |
| debugging    | Debugging            | take_snapshot, take_screenshot, evaluate_script  |
| extensions   | Extensions           | install_extension, list_extensions               |
| in-page      | In-page tools        | list_in_page_tools, execute_in_page_tool         |
| memory       | Memory               | take_memory_snapshot, heap aggregates queries    |

A separate `labels` object provides the human-readable category name.

## Evidence

- `src/tools/categories.ts` — the `ToolCategory` enum and `labels` map.
- `src/index.ts::registerTool` — category-based gating on `--no-category-*`.
- `scripts/generate-docs.ts` — iterates `sortedCategories` derived from the enum order, which defines the doc layout.

## Implications

- The order is part of the public contract: users scan docs top-down. Don't reorder casually.
- Adding a category implies adding a CLI flag, a labels entry, doc rendering support. It's a multi-touch change.
- A tool should pick exactly one category. If two seem to apply, the "most user-facing purpose" wins (e.g., `take_snapshot` is debugging, not in-page, because agents use it to see the DOM).
- For product taxonomy in a different domain, the pattern holds: 6-10 crisp categories beat 30 fine ones for agent + human navigation.
