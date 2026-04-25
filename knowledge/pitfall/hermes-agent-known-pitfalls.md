---
version: 0.1.0-draft
name: hermes-agent-known-pitfalls
summary: Catalog of real bugs encountered building an LLM agent — each with the pattern that prevents recurrence.
category: pitfall
tags: [llm-agents, pitfalls, bugs, lessons-learned]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Hermes Agent Known Pitfalls (Codified)

From `AGENTS.md`, these were each the source of multiple bugs before being captured as rules.

## Hardcoded `~/.hermes` paths

```python
# BAD — breaks profile support
config_path = Path.home() / ".hermes" / "config.yaml"

# GOOD
from hermes_constants import get_hermes_home
config_path = get_hermes_home() / "config.yaml"
```

Hardcoding home paths broke 5 separate places in PR #3575 when multi-profile support landed. Rule: `get_hermes_home()` for code paths, `display_hermes_home()` for user-facing messages (the latter renders `~/.hermes` or `~/.hermes/profiles/<name>` as appropriate).

## `simple_term_menu` ghosting in tmux/iTerm2

Rendering bugs cause stale menu lines on scroll. Use stdlib `curses` instead. See `hermes_cli/tools_config.py` for the pattern.

## ANSI `\033[K` under prompt_toolkit's `patch_stdout`

The erase-to-EOL code leaks as literal `?[K` text. Use space-padding:

```python
# BAD
print(f"\r{line}\033[K", end="")

# GOOD
print(f"\r{line}{' ' * pad}", end="")
```

## Process-global `_last_resolved_tool_names` in `model_tools.py`

`_run_single_child()` in `delegate_tool.py` saves/restores this global around subagent execution. Any new code that reads this global may see stale values during child runs. Better pattern: ContextVars.

## Cross-tool references in schema descriptions

Do NOT write tool schemas like:

> `browser_navigate`: "Prefer `web_search` for simple queries."

Those tools may not be available (missing API key, disabled toolset) — the model will hallucinate calls to nonexistent tools. Add cross-references dynamically in `get_tool_definitions()` *after* you know which tools actually resolved. See the `browser_navigate` / `execute_code` post-processing in `model_tools.py` for the pattern.

## Tests writing to `~/.hermes/`

The `_isolate_hermes_home` autouse fixture redirects `HERMES_HOME` to a temp dir. Never hardcode paths in tests. Profile-related tests also need `Path.home()` mocked:

```python
@pytest.fixture
def profile_env(tmp_path, monkeypatch):
    home = tmp_path / ".hermes"; home.mkdir()
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    monkeypatch.setenv("HERMES_HOME", str(home))
    return home
```

## Direct `pytest` vs `scripts/run_tests.sh`

Five CI-parity drifts that cause "works locally, fails in CI" (and vice versa):

| | Without wrapper | With wrapper |
|---|---|---|
| Provider API keys | Whatever is in env | All `*_API_KEY`/`*_TOKEN` unset |
| HOME / `~/.hermes/` | Your real config | Temp dir per test |
| Timezone | Local | UTC |
| Locale | Whatever is set | C.UTF-8 |
| xdist workers | `-n auto` = 20+ cores | `-n 4` matching CI |

`tests/conftest.py` enforces 1-4 via autouse fixture but wrapper is belt-and-suspenders. Running more than 4 xdist workers surfaces test-ordering flakes CI never sees.

## Missing `contextvars.copy_context()` at thread hop

ContextVars don't cross `ThreadPoolExecutor.submit()` automatically. Cron scheduler preserves skill-declared env passthrough with `contextvars.copy_context().run(agent.run_conversation, prompt)`. Pattern: anytime you hop into a thread from agent code, copy the context.

## Async `os.environ` for session identity

`os.environ` is process-global; the gateway runs agent turns concurrently in executor threads. A session-scoped ContextVar fallback prevents races. Hermes uses a ContextVar with env fallback specifically for legacy single-threaded callers (CLI, cron, tests).

## Working directory behavior differs by surface

- **CLI**: `os.getcwd()`
- **Messaging gateway**: `MESSAGING_CWD` env var (default: home directory)

Don't assume `os.getcwd()` is meaningful in gateway context.
