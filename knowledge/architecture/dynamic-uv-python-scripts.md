---
version: 0.1.0-draft
name: dynamic-uv-python-scripts
summary: Craft Agents ships a bundled uv binary and a set of PEP-723 self-dependency Python scripts (pdf_tool, docx_tool, xlsx_tool, markitdown, ical_tool, ...) so document-handling tools work without asking the user to install Python.
category: architecture
tags: [python, uv, pep-723, document-tools]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/resources/scripts
imported_at: 2026-04-18T00:00:00Z
---

# Dynamic uv + Python document toolchain

### Why Python, not JS
Document processing (PDF extraction, Office format conversion, iCal parsing) has MUCH better library coverage in Python than JS. markitdown, pypandoc, openpyxl, python-docx, icalendar, PIL — all mature.

### The zero-install approach
Shipping Python with an Electron app is painful (large, platform-specific). Craft Agents uses `uv` instead:

1. Build-time: download the uv binary for each target platform (darwin-arm64 / darwin-x64 / win32-x64 / linux-x64) into `resources/bin/<platform>-<arch>/uv{,.exe}`.
2. Ship only the relevant binary per installer via electron-builder per-platform extraResources.
3. Electron main process sets `CRAFT_UV`, `CRAFT_SCRIPTS` env vars and prepends `resources/bin` to PATH.
4. User invokes a tool (e.g. `pdf-tool`); wrapper script does `exec "$CRAFT_UV" run --script "$CRAFT_SCRIPTS/pdf_tool.py" "$@"`.
5. uv auto-downloads a pinned Python 3.12 to `~/.cache/uv/` on first use (~20MB, one-time).
6. PEP 723 inline script dependencies are parsed from `# /// script` blocks; uv creates an ephemeral venv, installs deps, runs the script.

### Smoke tests
`bun run test:doc-tools` invokes `python3 -m unittest apps.electron.resources.scripts.tests.test_*_smoke` — runs each tool's sanity test. Runs in CI against the same Python scripts that ship.

### Script shape
```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["markitdown"]
# ///
import sys
from markitdown import MarkItDown
# ... tool logic reading stdin / args, emitting stdout
```

### Windows parity
Windows ships both a bare script (POSIX wrapper) AND `.cmd` variant (e.g. `pdf-tool` + `pdf-tool.cmd`). Build scripts copy both during resource assembly; bundler excludes the non-target one per platform.

### Trade-offs
- Extra ~20MB for uv per installer arch, plus another ~20MB at user's first-use.
- First invocation is ~5s (Python download + venv setup). Subsequent calls are instant.
- uv caches per-script deps; rare dep upgrades might leave some stale caches (manual cleanup via `uv cache clean`).

### Reference
- `apps/electron/resources/scripts/` — Python scripts.
- `apps/electron/resources/bin/` — uv binaries + wrapper scripts.
- `scripts/build/common.ts` — `downloadUv(config)` logic.
- `apps/electron/src/main/index.ts` — env wiring for CRAFT_UV and PATH.
