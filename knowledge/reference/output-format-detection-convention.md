---
version: 0.1.0-draft
name: output-format-detection-convention
summary: OpenSRE picks rich vs plain-text output using a four-tier probe — TRACER_OUTPUT_FORMAT env first, NO_COLOR second, SLACK_WEBHOOK_URL third, sys.stdout.isatty() last — so TTY detection, explicit overrides, and downstream consumers all compose.
category: reference
tags: [cli, tty-detection, no-color, rich]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/output.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Output Format Detection — Four-Tier Probe

## The probe order
```python
def get_output_format() -> str:
    if fmt := os.getenv("TRACER_OUTPUT_FORMAT"): return fmt
    if os.getenv("NO_COLOR") is not None:        return "text"
    if os.getenv("SLACK_WEBHOOK_URL"):           return "text"
    return "rich" if sys.stdout.isatty() else "text"
```

Each tier has a specific reason:

1. **`TRACER_OUTPUT_FORMAT` env** — explicit user override. Highest priority so users can force rich in pipes or force text in terminals.
2. **`NO_COLOR`** — industry standard (no-color.org). Presence-only check: `os.getenv("NO_COLOR") is not None` (value doesn't matter).
3. **`SLACK_WEBHOOK_URL`** — app-specific: if the program's output is destined for Slack, ANSI control chars get rendered literally and look broken.
4. **`sys.stdout.isatty()`** — default: rich when interactive, plain when piped.

## Why the ordering matters
- Putting `isatty()` first would mean `NO_COLOR=1` in a terminal gets ignored.
- Putting `NO_COLOR` before the env override would prevent users from forcing rich despite NO_COLOR (legitimate when piping through a rich-aware tool like `less -R`).
- Putting `SLACK_WEBHOOK_URL` low in the chain means users running the program interactively alongside slack delivery still get rich output.

## Generalize
The pattern "probe a list of env vars + TTY in a specific order, each layer overrideable by the one above" is a good default for any CLI that has multiple output modes (plain, rich, JSON). Document the order in a docstring so future maintainers don't accidentally reshuffle it.

## Downstream usage
`get_output_format()` returns a string. All spinner/tracker/debug code branches on it:
```python
if get_output_format() == "rich":
    # use Rich Console
else:
    # plain print
```

The resulting renderer differences include: spinner thread vs print on start; colored dots vs ASCII markers; ANSI reset codes vs plain text.
