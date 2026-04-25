---
name: log-deduplication-and-error-taxonomy
description: Deduplicate noisy log lines by collapsing variable tokens (UUIDs, timestamps, IPs, hex addresses) into a normalized signature, then group remaining errors into a taxonomy of types (ConnectionTimeout, OOM, AuthError, ...) with affected components extracted.
category: observability
version: 1.0.0
version_origin: extracted
tags: [logs, deduplication, taxonomy, llm-context, error-classification]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/tools/utils/log_compaction.py
imported_at: 2026-04-18T00:00:00Z
---

# Log Deduplication + Error Taxonomy for LLM Context

## When to use
Hard cap on logs sent to the LLM (e.g. 50). A burst of 48 identical timeout messages should not consume 48 of those slots — you want one entry with `count=48` plus `first_seen`/`last_seen`. After deduplication, you also want a structured "what kinds of errors happened" summary so the LLM can reason over types instead of raw lines.

## How it works
- **Phase 1 (dedupe):** Replace UUIDs, ISO timestamps, epoch millis, IP/port pairs, hex addresses, and metric values with `<*>`. Group by `(log_level, normalized_message)`. Track first/last timestamps and total count.
- **Phase 2 (taxonomy):** Pre-compiled regex list maps message text to error-type buckets (`ConnectionTimeout`, `ConnectionRefused`, `DNSResolution`, `AuthenticationError`, `OutOfMemory`, `DiskFull`, `RateLimited`, `SchemaValidation`, `NullReference`, `PermissionDenied`, `ResourceNotFound`, `SyntaxError`, `ImportError`, `Exception`, `Unknown`).
- For each bucket, keep up to N unique sample messages and extract affected components from `service=foo` patterns and quoted identifiers.

## Example
```python
_VARIABLE_PATTERNS = [
    re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I),
    re.compile(r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*"),
    re.compile(r"\b\d{10,13}\b"),                                 # epoch
    re.compile(r"\b\d+\.\d+\.\d+\.\d+(:\d+)?\b"),                 # IP
    re.compile(r"\b0x[0-9a-fA-F]+\b"),                            # hex
    re.compile(r"\b\d+(\.\d+)?\s*(ms|s|sec|seconds|bytes|KB|MB|GB)\b"),
]
def _normalize_message(msg):
    out = msg
    for p in _VARIABLE_PATTERNS:
        out = p.sub("<*>", out)
    return out.strip()

def deduplicate_logs(logs, *, max_output=None):
    groups = {}
    for log in logs:
        key = f"{log.get('log_level','').upper()}::{_normalize_message(log.get('message',''))}"
        if key in groups:
            g = groups[key]; g["count"] += 1
            ts = str(log.get("timestamp","") or "")
            if ts and (not g["first_seen"] or ts < g["first_seen"]): g["first_seen"] = ts
            if ts and (not g["last_seen"]  or ts > g["last_seen"]):  g["last_seen"]  = ts
        else:
            groups[key] = {"message": log.get("message",""),
                           "log_level": log.get("log_level",""),
                           "count": 1, "first_seen": log.get("timestamp",""),
                           "last_seen":  log.get("timestamp","")}
    return sorted(groups.values(), key=lambda g: g["first_seen"])[:max_output]

_ERROR_TYPE_PATTERNS = [
    ("ConnectionTimeout", re.compile(r"timeout|timed?\s*out", re.I)),
    ("OutOfMemory",       re.compile(r"out\s*of\s*memory|oom\s*kill|memory\s*(error|exceed|limit)", re.I)),
    ("AuthenticationError", re.compile(r"auth(entication|orization)?\s*(fail|error|denied)|401|403", re.I)),
    # ...
]
```

## Gotchas
- Always sort patterns from most-specific to most-generic; otherwise `Exception` will swallow real `OutOfMemory` matches.
- Dedup BEFORE truncating to a cap — truncate-then-dedup loses unique low-frequency errors.
- For Loki/Datadog, fetch a wide raw window (e.g. 200 lines) and apply this compaction before passing to the LLM. The taxonomy gives a "complete picture" that fits in a few hundred tokens.
- Store both `compacted_logs` (with counts) and `raw_samples` (a few full strings) so the LLM has both signal and texture.
