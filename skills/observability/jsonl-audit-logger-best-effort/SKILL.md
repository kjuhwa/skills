---
name: jsonl-audit-logger-best-effort
description: Append-only JSONL audit log for security-relevant events that swallows OS errors so logging failures never crash the calling code, and reads back the last N entries on demand.
category: observability
version: 1.0.0
version_origin: extracted
tags: [audit, jsonl, append-only, best-effort]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/guardrails/audit.py
imported_at: 2026-04-18T00:00:00Z
---

# Best-Effort JSONL Audit Logger

## When to use
You need a tamper-evident-ish audit trail for security events (guardrail matches, key resolutions, redactions) that lives on the user's local disk, but a disk-full or permission error must NOT propagate up and crash the LLM call.

## How it works
- One file (default `~/.opensre/guardrail_audit.jsonl`).
- `log()` writes one JSON object per line with UTC timestamp, rule name, action, and a 40-char preview of the matched text.
- All writes wrapped in `try/except OSError` and just log a warning on failure.
- `read_entries(limit=100)` returns the last N parsed entries, skipping malformed lines.

## Example
```python
import json, logging
from datetime import UTC, datetime
from pathlib import Path

class AuditLogger:
    def __init__(self, path: Path | None = None) -> None:
        self._path = path or Path.home() / ".opensre" / "guardrail_audit.jsonl"

    def log(self, *, rule_name: str, action: str,
            matched_text_preview: str, context: str = "") -> None:
        preview = matched_text_preview[:40]
        entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "rule_name": rule_name, "action": action,
            "matched_text_preview": preview, "context": context,
        }
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry) + "\n")
        except OSError:
            logging.getLogger(__name__).warning("Failed to write audit to %s", self._path)

    def read_entries(self, *, limit: int = 100) -> list[dict]:
        if not self._path.exists(): return []
        try:
            lines = self._path.read_text(encoding="utf-8").strip().splitlines()
        except OSError:
            return []
        out = []
        for line in lines[-limit:]:
            try: out.append(json.loads(line))
            except json.JSONDecodeError: continue
        return out
```

## Gotchas
- Always preview-truncate the matched text — never write full secrets to the audit log; the audit defeats its own purpose if the file becomes a leaked-secrets goldmine.
- Use `Path.home() / ".myapp" / ...` so the audit lives outside the project tree and survives `git clean`.
- For high-throughput scenarios, batch-buffer writes and flush periodically; this implementation is simple enough for sub-100-event/sec workloads.
