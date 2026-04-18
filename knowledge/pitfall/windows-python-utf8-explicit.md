---
version: 0.1.0-draft
name: windows-python-utf8-explicit
description: "On Windows, Python defaults to cp949/cp1252 locale encoding — all file I/O on UTF-8 content (JSON with em-dashes, CJK text) must specify encoding='utf-8' explicitly"
type: knowledge
category: pitfall
source:
  kind: session
  ref: session-2026-04-16-hub-install-all
confidence: high
tags: [windows, python, encoding, utf-8, cp949]
---

## Fact

Python on Windows defaults to the system locale encoding (cp949 for Korean, cp1252 for Western). Reading a UTF-8 JSON file containing em-dashes (U+2014), CJK characters, or other non-ASCII without `encoding='utf-8'` raises `UnicodeDecodeError: 'cp949' codec can't decode byte 0xe2`. Similarly, `print()` to stdout fails with `UnicodeEncodeError` for the same characters.

## Why

The skills-hub `index.json` contains em-dashes in skill descriptions. A Python script reading it with `open(path)` (no encoding param) failed immediately on the first em-dash character. Fix required adding `encoding='utf-8'` to every `open()` call for both reads and writes, plus wrapping stdout for print statements.

## How to apply

- **Every** `open()` call on files that may contain non-ASCII: `open(path, encoding='utf-8')`
- For stdout: `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` or redirect output to a file
- For JSON: `json.dump(..., ensure_ascii=True)` sidesteps the issue by escaping non-ASCII, but loses readability
- Use `datetime.now(timezone.utc)` not `datetime.utcnow()` (deprecated in Python 3.12+)

## Counter / Caveats

Setting `PYTHONUTF8=1` environment variable makes Python default to UTF-8 on Windows, but this is a global setting that may affect other scripts. The explicit `encoding=` parameter is safer per-call.
