# AI Agent Orchestration Dashboard

> **Why.** Multi-agent AI systems are the defining trend of 2025-2026, but understanding how agents communicate, delegate, and collaborate is hard without visualization. This dashboard renders agent orchestration flows as an interactive force-directed graph with real-time particle animations, message logs, and aggregate stats.

## Features

- **6 agent types** — Planner, Architect, Executor, Reviewer, Designer, Writer — each color-coded.
- **D3.js force graph** — nodes pulse when active, edges animate with particle dots tracing message paths.
- **3 workflow scenarios** — Web App Development, AI Model Pipeline, Infra Deployment — auto-cycle.
- **Live message log** — color-coded, filterable by type (task/result/feedback).
- **Real-time stats** — messages sent, avg latency, active agents, tasks completed.
- **Speed control** — 0.3x to 3x simulation speed slider.
- **Zero deps** — single HTML file + D3.js CDN. Opens with `file://`.

## Usage

```
start browser\index.html
```

Click **▶ 시작** to begin the simulation.

## File structure

```
browser/
  index.html   — layout, controls, stat bar
  styles.css   — dark theme, glass-morphism, agent colors, animations
  app.js       — Agent/Message classes, SimulationEngine, D3 force graph
```

## Stack

HTML · CSS · JavaScript · D3.js v7
