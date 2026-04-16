# Hub Auto-Loop Dashboard

> **Why.** Fully automated pipeline that generates apps, publishes to skills-hub, extracts skills/knowledge, and loops — with a real-time web dashboard for monitoring.

## Features

- **Automated Pipeline** — generate → build → publish → merge → extract → publish-sk → install → loop
- **Web Dashboard** — real-time SSE-based UI showing pipeline phases, apps built, skills acquired, log stream
- **Claude CLI Integration** — uses `claude -p` via `execFile` for creative code generation and pattern extraction
- **Git Automation** — branch creation, PR, auto-merge, all handled programmatically
- **50 Keywords** — distributed systems concepts pool for infinite variety

## File structure

```
auto-hub-loop/
  server.js     — HTTP server + SSE + 7-phase orchestration engine (744 lines)
  index.html    — Dashboard with pipeline strip, app/skill panels, log stream (294 lines)
```

## Usage

```bash
node server.js
# open http://localhost:8917
# click "Start Loop"
```

## Stack

`node` · `html` · `css` · `vanilla-js` — zero external dependencies, 1,038 lines

## Provenance

- Built by Claude Code via `/hub-make` on 2026-04-16
- Source working copy: `D:/22_TEST/test/17-auto-hub-loop`
