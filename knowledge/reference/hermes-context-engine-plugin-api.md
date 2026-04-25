---
version: 0.1.0-draft
name: hermes-context-engine-plugin-api
summary: Pluggable context engine interface — swap compression strategies via config.context.engine without touching the agent.
category: reference
tags: [context-engine, plugin, llm-agents, abstraction]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Pluggable Context Engine Interface

Hermes abstracts "how we manage long conversations" behind a `ContextEngine` ABC so users can swap the default summarizer for alternatives (e.g. LCM — Large Context Memory) via config:

```yaml
# config.yaml
context:
  engine: compressor   # or "lcm"
```

Only one engine is active per conversation. The engine can also expose tools the agent can call (e.g. `lcm_grep`).

## Lifecycle

1. Engine instantiated and registered (plugin `register()` or default).
2. `on_session_start()` called when a conversation begins.
3. `update_from_response()` called after each API response with usage data.
4. `should_compress()` checked after each turn.
5. `compress()` called when `should_compress()` returns True.
6. `on_session_end()` called at **real** session boundaries (CLI exit, `/reset`, gateway session expiry) — NOT per-turn.

See `agent/context_engine.py:17-27`.

## Required state

Engines MUST maintain these attributes — `run_agent.py` reads them directly:

```python
class ContextEngine(ABC):
    last_prompt_tokens: int = 0
    last_completion_tokens: int = 0
    last_total_tokens: int = 0
    threshold_tokens: int = 0
    context_length: int = 0
    compression_count: int = 0

    # Compaction parameters
    threshold_percent: float = 0.75
    protect_first_n: int = 3
```

`threshold_percent = 0.75` means "start compressing when prompt tokens exceed 75% of context window". `protect_first_n = 3` means "always keep the first N messages uncompressed" (the system prompt + early priming).

## Abstract contract

```python
class ContextEngine(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    def on_session_start(self, messages): ...
    def update_from_response(self, response, prompt_tokens, completion_tokens): ...
    def should_compress(self, messages, approx_tokens) -> bool: ...
    def compress(self, messages, system_prompt, **kwargs) -> Tuple[List, Dict]: ...
    def on_session_end(self): ...
```

## Where plugins live

```
plugins/
├── context_engine/
│   ├── compressor/         # Default (built-in)
│   └── lcm/                # Third-party example
```

Plugin discovery happens at startup; the config key `context.engine` selects which to instantiate.

## Why expose it as a plugin point

- Compression is the single most research-adjacent part of an agent framework. Letting people swap engines without forking the repo is high-leverage.
- Different engines have **different UX implications** — LCM-style retrieval exposes grep-like tools to the agent; a classic summarizer is transparent. The agent's tool surface should reflect the engine.
- Token-usage tracking is shared state every engine needs. Keeping it on the base class avoids per-engine duplication.

## Reference

- `agent/context_engine.py` — ABC
- `agent/context_compressor.py` — default implementation
- `plugins/context_engine/` — plugin directory pattern
