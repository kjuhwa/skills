---
version: 0.1.0-draft
name: hermes-agent-project-structure
summary: Reference layout for a tool-heavy LLM agent framework with CLI, gateway, TUI, ACP, and RL environments.
category: architecture
tags: [llm-agents, project-structure, reference, python]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Hermes-Agent Project Structure Reference

An opinionated layout for a large LLM agent framework that exposes itself via CLI, messaging gateway, JSON-RPC TUI, ACP (editor protocol), cron scheduler, and RL training environments — while keeping the tool layer single-sourced.

## Top-level layout

```
hermes-agent/
├── run_agent.py          # AIAgent class — core conversation loop (sync)
├── model_tools.py        # Tool orchestration, discover_builtin_tools(), handle_function_call()
├── toolsets.py           # Toolset definitions, _HERMES_CORE_TOOLS list
├── cli.py                # HermesCLI — interactive CLI orchestrator
├── hermes_state.py       # SessionDB — SQLite session store (FTS5 search)
├── batch_runner.py       # Parallel batch processing for training data
├── agent/                # Agent internals (prompt_builder, caching, compression,
│                         #   credential_pool, model_metadata, rate_limit_tracker,
│                         #   smart_model_routing, display, trajectory)
├── hermes_cli/           # All `hermes ...` subcommands + setup wizard
├── tools/                # Tool implementations (one file per tool) + registry.py
│   └── environments/     # Terminal backends: local, docker, ssh, modal, daytona, singularity
├── gateway/              # Messaging gateway (Telegram, Discord, Slack, WhatsApp,
│                         #   Signal, Homeassistant, QQ) — platforms/ subdir per adapter
├── ui-tui/               # Ink (React) terminal UI — `hermes --tui`
├── tui_gateway/          # Python JSON-RPC backend for TUI
├── acp_adapter/          # ACP server (VS Code / Zed / JetBrains)
├── acp_registry/         # ACP agent.json manifest + icon
├── cron/                 # Scheduler (jobs.py, scheduler.py)
├── environments/         # RL training environments (Atropos)
├── docker/               # entrypoint.sh + SOUL.md default persona
├── skills/               # Bundled skill library (synced to ~/.hermes/skills/)
├── optional-skills/      # Skills not bundled by default
├── plugins/              # context_engine, memory, example-dashboard — pluggable
├── docs/                 # User + developer docs
├── tests/                # ~3000 pytest tests
└── tinker-atropos/       # Git submodule: RL framework integration
```

## Dependency chain

```
tools/registry.py  (no deps — imported by all tool files)
       ↑
tools/*.py  (each calls registry.register() at import time)
       ↑
model_tools.py  (imports tools.registry + triggers tool discovery)
       ↑
run_agent.py, cli.py, batch_runner.py, environments/
```

The chain is strict: nothing in `tools/` imports from `model_tools` or `run_agent`. This keeps the auto-discovery pass from triggering heavy imports.

## User state layout

```
~/.hermes/
├── config.yaml              # Settings
├── .env                     # API keys
├── SOUL.md                  # Persona file
├── state.db                 # SQLite sessions + FTS5 search
├── processes.json           # Background process checkpoint
├── cron/
│   ├── jobs.json
│   ├── .tick.lock
│   └── output/{job_id}/{timestamp}.md
├── sessions/                # Session artifacts
├── logs/
├── hooks/{name}/{HOOK.yaml, handler.py}
├── memories/
├── skills/                  # User + synced bundled skills
│   └── .bundled_manifest    # name:origin_hash per line
├── skins/                   # User CLI themes (.yaml drop-in)
├── plans/
├── workspace/
├── home/                    # Per-profile HOME for subprocesses (git, ssh, gh, npm)
└── profiles/<name>/…        # Multi-instance — a full ~/.hermes clone
```

Multi-profile support is built in via `HERMES_HOME` override — `get_hermes_home()` everywhere (never `Path.home() / ".hermes"`).

## Key AIAgent class (run_agent.py)

```python
class AIAgent:
    def __init__(self,
        model: str = "anthropic/claude-opus-4.6",
        max_iterations: int = 90,
        enabled_toolsets: list = None,
        disabled_toolsets: list = None,
        quiet_mode: bool = False,
        save_trajectories: bool = False,
        platform: str = None,           # "cli", "telegram", "cron", "acp", etc.
        session_id: str = None,
        skip_context_files: bool = False,
        skip_memory: bool = False,
        # + provider, api_mode, callbacks, routing params
    ): ...

    def chat(self, message: str) -> str: ...                     # simple
    def run_conversation(self, user_message, ...) -> dict: ...    # full
```

The core loop (`run_conversation`) is synchronous. Async adapters (ACP, gateway) bridge via `ThreadPoolExecutor`.

## Reference paths

- Tool registry: `tools/registry.py`
- Auto-discovery: `tools/registry.py:56-73` (AST-gated)
- Prompt cache: `agent/prompt_caching.py`
- Context compression: `agent/context_compressor.py`
- Delegation: `tools/delegate_tool.py`
- Background processes: `tools/process_registry.py`
- Cron scheduler: `cron/scheduler.py`
- ACP server: `acp_adapter/server.py`
- Docker entrypoint: `docker/entrypoint.sh`
- Skills sync: `tools/skills_sync.py`
