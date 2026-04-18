---
version: 0.1.0-draft
name: yaml-block-scalar-frontmatter-parsing
type: knowledge
category: pitfall
tags: [yaml, frontmatter, parser, heuristic, pitfall]
summary: "Regex-based frontmatter parsers that treat every `key: value` line as a scalar will collapse `description: |` (YAML block scalar) to the single character `|`, causing downstream metadata-empty heuristics to over-fire on fully-written entries."
source:
  kind: session
  ref: hub-refactor archive detection 2026-04-17
confidence: high
linked_skills: []
---

# Pitfall: YAML block scalars break naive frontmatter parsers

## Fact

A naive line-by-line regex parser that handles frontmatter like:

```python
m = re.match(r"^([a-zA-Z_]+)\s*:\s*(.*)$", line)
# ...stores v as the value
```

collapses this valid YAML

```yaml
description: |
  Safety guardrails for destructive commands. Warns before rm -rf,
  DROP TABLE, force-push, git reset --hard, and more.
```

to `description = "|"` — a single-character value. The indented continuation lines get silently dropped.

## Why

When a downstream check does something like `len(description) < 60`, every well-documented skill using the `|` block-scalar form passes the threshold and gets flagged as "metadata-empty" — the exact opposite of the intent.

Real incident: in `/hub-refactor`'s archive detection pass, condition B (metadata-empty skills) flagged `security/careful`, `security/guard`, `workflow/freeze`, `workflow/unfreeze` — all fully-fleshed gstack skills with 300+ character descriptions in `|` blocks. Only `backend/dev-controller-tenant-wrapping-helper` was a legitimate candidate; the other four were parser bugs.

## How to apply

A frontmatter parser that needs to work on real-world YAML must handle at least:

1. **`key: |`** and **`key: >`** (literal / folded block scalars), plus chomping indicators (`|-`, `|+`, `>-`, `>+`).
2. When a block scalar is opened, **continue consuming indented lines** until indent drops or the frontmatter ends. Record the first non-empty line's indent as the block's base indent; strip that indent from each subsequent line.
3. Flush the accumulated block when indent drops OR at `---` (frontmatter end).

Minimal Python pattern:

```python
if v in ("|", ">", "|-", ">-", "|+", ">+"):
    cur_block_key = k
    cur_block_indent = None
    cur_block_lines = []
    continue
# ...on subsequent lines while cur_block_key is set:
leading = len(line) - len(line.lstrip(" "))
if cur_block_indent is None:
    cur_block_indent = leading  # first non-empty line defines indent
if leading >= cur_block_indent:
    cur_block_lines.append(line[cur_block_indent:])
else:
    fm[cur_block_key] = "\n".join(cur_block_lines).strip()
    # cur_block_* reset, fall through to normal parsing
```

## Evidence

- `/hub-refactor` archive candidates after adding the parser fix: false-positive count dropped from 4 of 5 (80% noise) to 1 of 1 (100% signal).
- Fix shipped in the same session; the bugfix landed with the `source_type: external-git` guard as part of `bootstrap/v2.3.0`.

## Counter / Caveats

- For one-shot scripts that only need to read top-level scalars (name, category, version), the naive parser is fine — don't overfit.
- Full YAML compliance also requires handling anchors (`&`), aliases (`*`), flow-style maps, and quoted strings spanning lines. If your scanner needs those, use a real YAML library (PyYAML, ruamel.yaml) instead of extending the regex parser — the cost/benefit flips past block scalars.
- Knowledge entries in this corpus commonly use `summary: |` — the same fix protects their scans too.
