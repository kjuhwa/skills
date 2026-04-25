---
version: 0.1.0-draft
name: hermes-terminal-backends-catalog
summary: Six terminal backends an LLM agent can run commands in — local, docker, ssh, modal, daytona, singularity.
category: domain
tags: [agent-terminal, sandboxing, modal, daytona, singularity, docker]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Terminal Backend Catalog for Agent Command Execution

Hermes ships six interchangeable terminal backends so `terminal("pytest -v")` can run on your laptop, in a container, on a remote VM, or in a serverless sandbox — same tool surface, different isolation. The choice is made via `TERMINAL_ENV` env var or the `terminal_backend` config key.

## The six backends

All live in `tools/environments/`:

| Backend | `TERMINAL_ENV` value | What it runs in | When to use |
|---|---|---|---|
| Local | `local` | Host machine directly | Development; trust + speed |
| Docker | `docker` | Spawned Docker container | Reproducible env + isolation from host |
| SSH | `ssh` | Remote host via SSH | Agent runs code on target servers |
| Modal | `modal` | Modal serverless sandbox | Hibernates when idle, wakes on demand; near-zero idle cost |
| Daytona | `daytona` | Daytona serverless workspace | Same as Modal but a different provider |
| Singularity | `singularity` | HPC singularity container | Academic / cluster-native isolation |

## Common interface

Each backend implements:

```python
class Environment:
    def execute(self, command: str, timeout: int = 120) -> dict:
        """Run a shell command. Returns {'output': str, 'exit_code': int, ...}"""

    def get_temp_dir(self) -> str:
        """Writable temp dir inside the sandbox."""

    def get_cwd(self) -> str: ...
    def set_cwd(self, path: str) -> None: ...
    def upload_file(self, local: Path, remote: str) -> None: ...
    def download_file(self, remote: str, local: Path) -> None: ...
    def close(self) -> None: ...
```

Background process spawning has two paths:

- **Local** → `spawn_local()` with real `subprocess.Popen`, live stdout pipe, optional PTY mode.
- **Non-local** → `spawn_via_env()` which writes a wrapper shell that backgrounds the command via `nohup`, captures PID/log/exit to files in `/tmp`, and polls those files from the host. No live pipe, but survives long runs.

## Why serverless backends matter

From the README:

> Daytona and Modal offer serverless persistence — your agent's environment hibernates when idle and wakes on demand, costing nearly nothing between sessions. Run it on a $5 VPS or a GPU cluster.

This is the differentiator: a local agent needs an always-on machine. A Modal-backed agent costs nearly nothing when you're asleep, then fires back up when you message it from your phone.

## Key configurables

```yaml
# config.yaml
terminal_backend: modal
terminal_timeout: 120             # per-command timeout, seconds
terminal_lifetime: 3600           # sandbox idle lifetime; cleanup thread reaps older
```

`terminal_lifetime` must be longer than the longest gap between tool calls (e.g. while waiting for an LLM response).

## Picking a backend for your workflow

- **"I want fast iteration on my laptop"** → `local`.
- **"I want reproducible CI-like environments, still on my box"** → `docker`.
- **"I want the agent to deploy to servers"** → `ssh`.
- **"I want always-available but nearly-free"** → `modal` or `daytona`.
- **"I'm on an HPC cluster"** → `singularity`.

## Backend-specific quirks

- **Local PTY mode** needs `ptyprocess` (Unix) or `winpty` (Windows) and is the only way to interact with CLI tools like Claude Code, Codex, or REPLs that check `isatty()`.
- **Docker entrypoint** must respect `HERMES_UID`/`HERMES_GID` remap (see docker skill) for volume ownership to work.
- **Modal/Daytona** need API keys and a baked container image — boot cold-start is ~5-30s so cache aggressively.
- **SSH** requires you to think about dangerous-command approval *twice* — once on the controller (prevents sending), once on the target (prevents execution). Hermes only gates on the controller.

## Reference

- `tools/environments/` — backend implementations
- `tools/process_registry.py:421-500` — `spawn_via_env` generic wrapper
- `environments/hermes_base_env.py` — RL training uses same abstraction
