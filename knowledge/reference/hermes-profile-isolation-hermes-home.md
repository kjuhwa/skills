---
version: 0.1.0-draft
name: hermes-profile-isolation-hermes-home
summary: Multi-instance isolation pattern — one HERMES_HOME env var scopes all state, credentials, and sessions.
category: reference
tags: [profiles, multi-tenant, environment-variables, isolation, python]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Profile Isolation via `HERMES_HOME` Override

Hermes supports multiple fully-isolated instances ("profiles"), each with its own config, API keys, memory, sessions, skills, and gateway state. The mechanism is a single env var and a helper function used consistently across the codebase.

## Core mechanism

`_apply_profile_override()` in `hermes_cli/main.py` runs BEFORE any module imports and sets `HERMES_HOME`. All 119+ references to `get_hermes_home()` automatically scope to the active profile.

```python
# Invocation
hermes -p coder <command>

# Effective HERMES_HOME
~/.hermes/profiles/coder/
```

Default profile (no `-p`) uses `~/.hermes/`.

## Rules for profile-safe code

### 1. Use `get_hermes_home()` for code paths

```python
from hermes_constants import get_hermes_home
config_path = get_hermes_home() / "config.yaml"
```

NEVER `Path.home() / ".hermes"` — that ignores the override.

### 2. Use `display_hermes_home()` for user-facing text

```python
from hermes_constants import display_hermes_home
print(f"Config saved to {display_hermes_home()}/config.yaml")
```

Returns `~/.hermes` for default or `~/.hermes/profiles/<name>` for profiles — the right label for the current context.

### 3. Module-level constants are fine

Since `_apply_profile_override()` runs before any module imports, module-level `CONST = get_hermes_home() / "..."` caches the right value:

```python
CHECKPOINT_PATH = get_hermes_home() / "processes.json"   # safe
```

### 4. Profile operations are HOME-anchored, not HERMES_HOME-anchored

```python
_get_profiles_root() returns Path.home() / ".hermes" / "profiles"
```

NOT `get_hermes_home() / "profiles"`. This is intentional — `hermes -p coder profile list` must see all profiles regardless of which one is active.

### 5. Gateway platform adapters use token locks

When an adapter connects with a unique credential (bot token, API key), two profiles must not use the same credential simultaneously. Call `acquire_scoped_lock()` from `gateway.status` in the adapter's `connect()`/`start()` method and `release_scoped_lock()` in `disconnect()`/`stop()`. See `gateway/platforms/telegram.py` for the canonical pattern.

### 6. Tests must mock both `Path.home()` and `HERMES_HOME`

```python
with patch.object(Path, "home", return_value=tmp_path), \
     patch.dict(os.environ, {"HERMES_HOME": str(tmp_path / ".hermes")}):
    ...
```

Mocking only `Path.home()` works for most code (because `get_hermes_home()` falls through to `Path.home() / ".hermes"`) but profile-related tests need both because `_get_profiles_root()` uses `Path.home()` directly.

## What a profile isolates

- `config.yaml`, `.env`
- `state.db` (SQLite sessions, FTS5)
- `cron/jobs.json`, `cron/output/`
- `skills/` (with own `.bundled_manifest`)
- `skins/`
- `hooks/`
- `memories/`
- `plans/`
- `workspace/`
- `home/` (per-profile HOME for `git`, `ssh`, `gh`, `npm` subprocesses — prevents leaking into `/root`)
- `processes.json` (background process checkpoint)

## Why a single env var and not a config flag

- **Works before imports.** Many modules read `get_hermes_home()` at import time (constants, paths). A config-flag approach would require delaying imports.
- **Works for subprocesses.** When the agent spawns `git`, exporting `HERMES_HOME` into the child is one `env["HERMES_HOME"] = ...` line. A Python-internal flag doesn't propagate to subprocesses.
- **Works in tests.** `monkeypatch.setenv("HERMES_HOME", ...)` is the standard pattern.

## Reference

- `hermes_cli/main.py` — `_apply_profile_override()`
- `hermes_constants.py` — `get_hermes_home()`, `display_hermes_home()`
- `AGENTS.md` "Profiles: Multi-Instance Support" section
