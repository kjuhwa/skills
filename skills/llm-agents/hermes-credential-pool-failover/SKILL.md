---
name: hermes-credential-pool-failover
description: Persistent multi-credential pool for same-provider failover with 429/402 cooldowns and strategy selection.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, credentials, rate-limit, failover, providers]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Same-Provider Credential Pool with Failover

## Context

A single OpenRouter / OpenAI / Kimi / Anthropic key eventually hits 429 (rate-limit) or 402 (quota) in a long agent session. Swapping to a different **provider** loses the model. Keeping N keys for the same provider and rotating when one exhausts is cheap insurance. Hermes' `CredentialPool` (`agent/credential_pool.py`) does exactly that, persists state across restarts, and supports four selection strategies.

## When to use

- You regularly hit 429 / 402 on a provider mid-run.
- You have access to multiple keys for the same provider (team accounts, trial tiers).
- You want exhaustion to be *sticky* across restarts — a crash shouldn't reset the 1-hour cooldown clock.

## Procedure

### 1. Data shape per credential

```python
@dataclass
class PooledCredential:
    provider: str
    id: str
    label: str
    auth_type: str       # "oauth" | "api_key"
    priority: int
    source: str           # "manual" | "cli_import" | ...
    access_token: str
    refresh_token: Optional[str] = None
    last_status: Optional[str] = None         # "ok" | "exhausted"
    last_status_at: Optional[float] = None
    last_error_code: Optional[int] = None
    last_error_reason: Optional[str] = None
    last_error_message: Optional[str] = None
    last_error_reset_at: Optional[float] = None
    expires_at: Optional[str] = None
    last_refresh: Optional[str] = None
    request_count: int = 0
    extra: Dict[str, Any] = None   # round-tripped JSON fields
```

(`agent/credential_pool.py:91-115`)

### 2. Four selection strategies

```python
STRATEGY_FILL_FIRST = "fill_first"   # stay on #1 until exhausted
STRATEGY_ROUND_ROBIN = "round_robin"
STRATEGY_RANDOM = "random"
STRATEGY_LEAST_USED = "least_used"
```

`fill_first` is the default and the right one if credentials have quotas (use the best one until it's done). `round_robin` spreads load. `least_used` rebalances after resumption.

### 3. 429 and 402 both cool down for 1 hour

```python
EXHAUSTED_TTL_429_SECONDS = 60 * 60
EXHAUSTED_TTL_DEFAULT_SECONDS = 60 * 60
```

Providers often return `reset_at` in response headers — prefer that if present; otherwise use the default.

### 4. Custom endpoints share a provider prefix

Anthropic-compatible endpoints that aren't Anthropic itself all use `provider="custom"` but key into the pool as `custom:<normalized_name>`:

```python
CUSTOM_POOL_PREFIX = "custom:"
```

This lets users add "Kimi via Moonshot" and "Kimi via custom-proxy" as separate pool entries without provider-name collision.

### 5. Status + error round-trip even when empty

```python
_ALWAYS_EMIT = {
    "last_status", "last_status_at", "last_error_code",
    "last_error_reason", "last_error_message", "last_error_reset_at",
}
```

Always emit these to JSON (even as `null`) so the management UI can render "last error: —" instead of crashing on missing keys.

### 6. Attribute fallback to `extra` for forward compat

```python
_EXTRA_KEYS = frozenset({
    "token_type", "scope", "client_id", "portal_base_url",
    "obtained_at", "expires_in", "agent_key_id", ...
})

def __getattr__(self, name: str):
    if name in _EXTRA_KEYS:
        return self.extra.get(name)
    raise AttributeError(...)
```

Fields that are "round-tripped through JSON but not used for logic" go into `extra`, not the dataclass. Lets you add new fields without a schema migration.

### 7. Token refresh skew

```python
CODEX_ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 300  # refresh 5min before expiry
DEFAULT_AGENT_KEY_MIN_TTL_SECONDS = 900
```

Don't wait until `expires_at` — refresh preemptively so an in-flight tool call doesn't fail with 401.

### 8. Lock the auth-store file across processes

```python
with _auth_store_lock:
    state = _load_auth_store()
    ...
    _save_auth_store(state)
```

Gateway + CLI + cron can all write concurrently. Without the lock, one wins and the others lose the rotation bookkeeping.

## Pitfalls

- **Don't reset `request_count` on update**. It's useful telemetry and losing it on every rotation makes "least used" strategy lie.
- **Provider-supplied `reset_at` > your default.** Even a 1-second reset from the provider should win over your 1-hour fallback.
- **Persist to disk, not memory.** Otherwise a crash right after exhaustion causes a retry storm on the bad key.
- **Keep refresh tokens out of logs.** The whole credential record should go through `redact_sensitive_text()` before any log emission.
