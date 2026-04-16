# MCP Protocol Playground

> **Why.** The Model Context Protocol (MCP) is rapidly becoming the standard for AI tool integration, but designing and testing tool schemas currently requires switching between docs, JSON editors, and test scripts. This playground combines schema editing, validation, and simulation in a single browser IDE.

## Features

- **10 built-in MCP templates** — file_read, file_write, web_search, database_query, api_call, code_execute, image_generate, translate, summarize, calendar_event.
- **Syntax-highlighted editor** — VS Code color scheme, line numbers, auto-format on paste.
- **JSON Schema validator** — checks MCP spec structure, required fields, type correctness.
- **Visual form builder** — auto-renders interactive form from schema properties.
- **Simulation engine** — execute tools with mock data, see full JSON-RPC 2.0 request/response.
- **Export** — copy to clipboard or download as `.json`.
- **Keyboard shortcuts** — Ctrl+Enter validate, Ctrl+Shift+E copy, Ctrl+Shift+F format.
- **Dark/Light theme** with localStorage persistence.
- **Zero deps** — opens with `file://`.

## Usage

```
start browser\index.html
```

Select a template from the dropdown, edit the schema, click **실행** to simulate.

## File structure

```
browser/
  index.html   — split-pane layout, toolbar, validation panel
  styles.css   — VS Code theme, syntax colors, resizable panes
  app.js       — templates, validator, form renderer, simulation engine
```

## Stack

HTML · CSS · JavaScript
