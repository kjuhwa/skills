---
version: 0.1.0-draft
name: hermes-atomic-json-checkpoint
summary: Atomic JSON write pattern for crash-safe checkpoint files — write to .tmp, rename.
category: engineering
tags: [json, atomic-write, crash-safety, checkpointing, python]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Atomic JSON Checkpoint Writes

## Problem

Hermes' `ProcessRegistry` persists running-process metadata to `~/.hermes/processes.json` on every spawn/kill/exit so it can recover after a crash (`tools/process_registry.py:1003-1033`). If the write is not atomic and the process crashes mid-flush, the next startup finds truncated JSON and:

1. Recovery silently does nothing.
2. Running processes become orphans (unkillable, untracked).
3. On the next checkpoint write, they're overwritten and lost.

This pattern applies anywhere you persist state that needs to survive a hard kill.

## Pattern — `utils.atomic_json_write`

```python
import json, os, tempfile

def atomic_json_write(path: Path, data) -> None:
    """Write JSON atomically: write to .tmp, fsync, rename."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # tempfile.NamedTemporaryFile in the same directory keeps rename atomic on POSIX
    fd, tmp_path = tempfile.mkstemp(
        prefix=path.name + ".",
        suffix=".tmp",
        dir=str(path.parent),
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)  # atomic on POSIX, best-effort on Windows
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
```

## Why each step matters

- **Same directory for tmp file.** `os.replace()` is atomic only within a filesystem. Using `/tmp` breaks atomicity if `~/.hermes` is a different mount.
- **`f.flush() + os.fsync()`.** Without this, the file system buffer holds your data — a power loss leaves a renamed-but-empty file.
- **`os.replace()` over `os.rename()`.** On Windows, `os.rename` fails if the target exists. `os.replace` overwrites.
- **Cleanup on exception.** If `json.dump` fails (non-serializable object), delete the partial tmp file so disk doesn't fill with `*.abc123.tmp` garbage.

## Read-side defense

Even with atomic writes, always wrap reads defensively — the file may be missing on first run, and the format may have evolved across versions:

```python
def load_checkpoint(path: Path) -> list:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("Checkpoint %s corrupt; starting fresh", path)
        return []
```

Do NOT re-write immediately on corrupt read — let the first legitimate state change do that, so a developer investigating the corruption still has the bad file.

## When to use

- Agent state: sessions, background processes, active credentials.
- Cron schedulers: next-run timestamps.
- Caching layers where cache coherency matters more than freshness.
- Any file a `kill -9` or power loss must not corrupt.

## When NOT to use

- High-frequency writes. Atomic write per mutation is ~5ms on a SATA SSD. If you're writing 100 times per second, batch into memory and flush on a timer.
- Log files — append-only writes to log files are already crash-safe (the tail may be truncated but the prefix is intact).

## Reference

- `tools/process_registry.py:1003-1033` — checkpoint write site
- `utils.py` — `atomic_json_write` implementation
