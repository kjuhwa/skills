---
name: langgraph-progress-spinner-tracker
description: Per-node animated spinner that shows a humanized label, cycling progress verbs, and live subtext updates, then resolves to a static line with timing and humanized message — gracefully degrades to plain text when not on a TTY or NO_COLOR is set.
category: observability
version: 1.0.0
version_origin: extracted
tags: [progress, spinner, tracker, langgraph, cli, rich]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/output.py
imported_at: 2026-04-18T00:00:00Z
---

# LangGraph Progress Spinner with Live Subtext

## When to use
You're running an agent that takes 30+ seconds per node. You want a polished CLI experience with one spinner per node, cycling progress verbs (e.g. "querying logs", "scanning monitors") so users know it's working, and the ability to update subtext mid-flight when a tool call starts. When stdout isn't a TTY (CI, Slack webhook context, NO_COLOR), fall back to plain text.

## How it works
- `get_output_format()` reads `TRACER_OUTPUT_FORMAT` env, then `NO_COLOR`, then `SLACK_WEBHOOK_URL`, then `sys.stdout.isatty()` — chooses `rich` or `text`.
- `_LiveSpinner` runs a daemon thread that paints `\033[2K\r` + spinner frame + label + verb every 100ms.
- Verbs cycle every 2.5s from a node-specific list (e.g. `investigate` cycles "querying logs", "fetching metrics", "scanning monitors", ...).
- `update_subtext(text, duration)` lets nodes push live status (e.g. "calling DataDogLogsTool") that overrides the cycling verb for N seconds.
- On `complete()`/`error()`, the spinner stops, the line is overwritten with a green/red dot + label + timing + humanized message.

## Example
```python
class _LiveSpinner:
    def __init__(self, node_name):
        self._label  = _node_label(node_name)
        self._verbs  = _LOADING_VERBS.get(node_name, ["working"])
        self._t0     = time.monotonic()
        self._done   = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True)

    def update_subtext(self, text, duration=4.0):
        self._override_text = text
        self._override_until = time.monotonic() + duration

    def _loop(self):
        while not self._done.wait(0.1):
            sys.stdout.write("\033[2K\r" + self._spinner_line())
            sys.stdout.flush()

class ProgressTracker:
    def start(self, node_name, message=None):
        if self._rich:
            s = _LiveSpinner(node_name); self._spinners[node_name] = s; s.start()
        else:
            print(f"  … {_node_label(node_name)}")

    def complete(self, node_name, fields_updated=None, message=None):
        elapsed = int((time.monotonic() - self._start_times.pop(node_name)) * 1000)
        if (s := self._spinners.pop(node_name, None)):
            s.stop(ProgressEvent(node_name, elapsed, ...))
```

## Gotchas
- Use `threading.Event.wait(timeout)` not `time.sleep(timeout)` so the spinner exits promptly on `stop()`.
- Always emit `\033[2K\r` (clear-line + carriage return) before the new frame; otherwise stale text from longer previous frames bleeds through.
- Detect `SLACK_WEBHOOK_URL` and force text mode — Slack mangles ANSI control characters.
- Keep the cycling verb list short and domain-specific; reading "working… working… working…" looks broken.
