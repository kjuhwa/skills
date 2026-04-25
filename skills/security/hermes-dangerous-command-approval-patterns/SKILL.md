---
name: hermes-dangerous-command-approval-patterns
description: Regex patterns and approval flow for blocking agent-issued destructive shell commands.
category: security
version: 1.0.0
version_origin: extracted
tags: [security, shell-safety, approval, agent-terminal, guardrails]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Dangerous Command Approval for Agent Terminals

## Context

When an LLM can run shell commands, you need more than an allowlist. You need (a) a regex catalog of destructive patterns, (b) per-session approval state keyed by context (not process-global env), (c) auto-approval of low-risk commands via an auxiliary LLM check, and (d) self-termination protection so the agent can't kill its own gateway.

## When to use

- Your agent can call `terminal()` or equivalent shell tool.
- You want approval prompts only for commands that warrant them.
- You need this to work correctly under gateway concurrency (multiple agents, different sessions).

## Procedure

### 1. Canonical regex catalog

Maintain a single list of `(pattern, description)` tuples. Good targets (from `tools/approval.py:76-139`):

```python
DANGEROUS_PATTERNS = [
    (r'\brm\s+(-[^\s]*\s+)*/', "delete in root path"),
    (r'\brm\s+-[^\s]*r', "recursive delete"),
    (r'\brm\s+--recursive\b', "recursive delete (long flag)"),
    (r'\bchmod\s+(-[^\s]*\s+)*(777|666|o\+[rwx]*w|a\+[rwx]*w)\b', "world-writable"),
    (r'\bchown\s+(-[^\s]*)?R\s+root', "recursive chown to root"),
    (r'\bmkfs\b', "format filesystem"),
    (r'\bdd\s+.*if=', "disk copy"),
    (r'>\s*/dev/sd', "write to block device"),
    (r'\bDROP\s+(TABLE|DATABASE)\b', "SQL DROP"),
    (r'\bDELETE\s+FROM\b(?!.*\bWHERE\b)', "SQL DELETE without WHERE"),
    (r'>\s*/etc/', "overwrite system config"),
    (r'\bsystemctl\s+(-[^\s]+\s+)*(stop|restart|disable|mask)\b', "stop/restart service"),
    (r':\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:', "fork bomb"),
    (r'\b(bash|sh|zsh|ksh)\s+-[^\s]*c(\s+|$)', "shell -c invocation"),
    (r'\b(python[23]?|perl|ruby|node)\s+-[ec]\s+', "inline script via -e/-c"),
    (r'\b(curl|wget)\b.*\|\s*(ba)?sh\b', "pipe remote content to shell"),
    (r'\bxargs\s+.*\brm\b', "xargs with rm"),
    (r'\bfind\b.*-exec\s+(/\S*/)?rm\b', "find -exec rm"),
    (r'\bfind\b.*-delete\b', "find -delete"),
    (r'\bgit\s+reset\s+--hard\b', "destroys uncommitted changes"),
    (r'\bgit\s+push\b.*--force\b', "rewrites remote history"),
    (r'\bgit\s+clean\s+-[^\s]*f', "deletes untracked files"),
    (r'\bgit\s+branch\s+-D\b', "force delete branch"),
    (r'\bchmod\s+\+x\b.*[;&|]+\s*\./', "chmod +x then immediate execute"),
]
```

### 2. Catch shell-variable shell-expansion of sensitive paths

Attackers/jailbreaks use `$HOME/.ssh` and `$HERMES_HOME` expansions to hide behind pattern matchers:

```python
_SSH_SENSITIVE_PATH = r'(?:~|\$home|\$\{home\})/\.ssh(?:/|$)'
_HERMES_ENV_PATH = (
    r'(?:~\/\.hermes/|'
    r'(?:\$home|\$\{home\})/\.hermes/|'
    r'(?:\$hermes_home|\$\{hermes_home\})/)'
    r'\.env\b'
)
_SENSITIVE_WRITE_TARGET = (
    rf'(?:/etc/|/dev/sd|{_SSH_SENSITIVE_PATH}|{_HERMES_ENV_PATH})'
)
```

### 3. Catch "kill via command substitution" — opaque to name-based patterns

```python
(r'\bkill\b.*\$\(\s*pgrep\b', "self-termination via pgrep"),
(r'\bkill\b.*`\s*pgrep\b', "self-termination via backtick pgrep"),
```

A simple `pkill hermes` is easy to match; `kill -9 $(pgrep -f hermes)` needs a structural pattern.

### 4. Catch heredoc execution that bypasses `-c` / `-e`

```python
(r'\b(python[23]?|perl|ruby|node)\s+<<', "script via heredoc"),
```

### 5. Gateway self-protection

Block commands that kill the agent's own process:

```python
(r'\bhermes\s+gateway\s+(stop|restart)\b', "kills running agents"),
(r'\bhermes\s+update\b', "hermes update restarts gateway"),
(r'\b(pkill|killall)\b.*\b(hermes|gateway|cli\.py)\b', "self-termination"),
(r'gateway\s+run\b.*(&\s*$|&\s*;|\bdisown\b|\bsetsid\b)',
 "start gateway outside systemd"),
```

### 6. Per-session approval state via ContextVars

`os.environ` for session identity is racy under gateway concurrency. Use a ContextVar with env fallback:

```python
_approval_session_key: contextvars.ContextVar[str] = contextvars.ContextVar(
    "approval_session_key", default="",
)

def get_current_session_key(default="default") -> str:
    session_key = _approval_session_key.get()
    if session_key:
        return session_key
    return get_session_env("HERMES_SESSION_KEY", default)
```

`set_current_session_key()` returns a token the caller uses to `reset_current_session_key()` after the agent turn — cleanup is mandatory. See `tools/approval.py:27-55`.

### 7. Smart approval via auxiliary LLM

For commands that match a broad-but-not-always-dangerous pattern (e.g. `rm -r tmp/test_artifacts`), call a cheap auxiliary LLM with the full command and context. Auto-approve if it returns low risk; otherwise prompt the user.

### 8. Persist user-approved patterns

Once the user types "always allow `git push`", write that pattern into `config.yaml` under `approval.allowlist` so the next session doesn't re-prompt. Distinguish this allowlist from the baked-in DANGEROUS_PATTERNS — allowlisted patterns simply short-circuit the check, they don't mutate the catalog.

## Pitfalls

- **Regexes alone are not a sandbox.** Any determined jailbreak can word-split or escape. Treat this as a user-experience filter, not a security boundary — run the terminal in a real sandbox (Docker/gVisor/Modal) for actual isolation.
- **Pattern-key stability.** Hermes maintains `_PATTERN_KEY_ALIASES` so legacy per-pattern approval state carries forward when a pattern is refactored (`tools/approval.py:142-150`). Without this, upgrading rewrites user approvals as "never approved".
- **Don't use a process-global env var for session identity under concurrency.** Two agent turns running in threads will race.
- **Long-flag aliases double pattern count.** For every `-r`/`-f`/`-R`, add a separate `--recursive`/`--force` case. Models love long flags because they read "safer" to the prompt.
