---
version: 0.1.0-draft
name: hermes-sqlite-session-db-fts5
summary: SQLite schema for agent session storage with FTS5 search, compression-triggered splitting, and WAL.
category: reference
tags: [sqlite, fts5, session-store, llm-agents, schema]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# SQLite Session Store with FTS5 (Hermes hermes_state.py)

Reference schema for a per-user agent session store that supports full-text search across all past conversations.

## Design decisions (`hermes_state.py:1-35`)

- **WAL mode** — concurrent readers + one writer (gateway handles multiple platforms simultaneously).
- **FTS5 virtual table** — fast text search across all session messages.
- **Compression-triggered session splitting** via `parent_session_id` chains.
- **Batch runner and RL trajectories are NOT stored here** — different retention / access patterns, separate systems.
- **Session source tagging** ('cli', 'telegram', 'discord', 'cron', 'acp', etc.) enables per-surface filtering.

## Schema (`hermes_state.py:36-120`)

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,                    -- 'cli' | 'telegram' | 'cron' | ...
    user_id TEXT,
    model TEXT,
    model_config TEXT,                       -- JSON
    system_prompt TEXT,
    parent_session_id TEXT,                  -- set on compression split
    started_at REAL NOT NULL,                -- unix epoch
    ended_at REAL,
    end_reason TEXT,                         -- 'user_reset' | 'compression' | 'cron_complete' | ...
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    title TEXT,                              -- auto-generated via title_generator
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,                      -- 'user' | 'assistant' | 'tool' | 'system'
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,                         -- JSON
    tool_name TEXT,
    timestamp REAL NOT NULL,
    token_count INTEGER,
    -- ... more cost/tracking fields
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content='messages',
    content_rowid='id'
);
```

Triggers keep `messages_fts` in sync on INSERT/UPDATE/DELETE.

## Session splitting on compression

When context is compressed, Hermes creates a new session row with `parent_session_id` pointing at the pre-compression session. The compressed summary becomes the first message of the new session. Chains of `parent_session_id` reconstruct the full logical conversation for search.

This means "current turn" queries should hit only the active session, but "search my history" queries can span the parent chain transparently.

## Session source tags

```
cli              # Interactive CLI
telegram         # Telegram gateway
discord          # Discord gateway
slack            # Slack gateway
whatsapp         # WhatsApp gateway
signal           # Signal gateway
matrix           # Matrix gateway
cron             # Cron scheduler
acp              # ACP (IDE integration)
batch            # Trajectory batch runner — actually NOT stored here
```

The `source` column is indexed because per-platform filtering is the most common UI need.

## Cost tracking distinct fields

`estimated_cost_usd` vs `actual_cost_usd` + `cost_status` (`"estimated"` | `"actual"` | `"unknown"`) + `cost_source` (`"response_headers"` | `"models_dev"` | `"hardcoded"`): lets the UI tell the user "this is a guess" vs "this is confirmed by the provider's billing endpoint".

`pricing_version` is the models.dev pricing table version used, so historical sessions don't silently shift when pricing changes.

## Reference

- Schema: `hermes_state.py:36-120`
- WAL setup and pragmas: `hermes_state.py` `SessionDB._init_db()`
- Thread-safety pattern: per-connection, keyed by thread ID
