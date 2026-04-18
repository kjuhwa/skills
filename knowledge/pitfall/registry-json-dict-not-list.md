---
version: 0.1.0-draft
name: registry-json-dict-not-list
description: "skills-hub registry.json stores skills and knowledge as dicts keyed by name, not arrays — list.append() fails silently or throws"
type: knowledge
category: pitfall
source:
  kind: session
  ref: session-2026-04-16-hub-install-all
confidence: high
tags: [registry, json, data-structure, skills-hub]
---

## Fact

`~/.claude/skills-hub/registry.json` stores `skills` and `knowledge` as **dict objects keyed by entry name**, not as arrays. Code that calls `registry['skills'].append(...)` will throw `'dict' object has no attribute 'append'`.

## Why

The initial `/hub-install-all` implementation assumed the registry used arrays (like `index.json`). 23 out of 240 skill installs failed with `'dict' object has no attribute 'append'` before the bug was caught. The first 217 succeeded because they were skipped (already existed on disk) — the append was never reached.

## How to apply

- Always inspect the registry structure before writing: `type(registry.get('skills'))` → expect `dict`
- Use dict assignment: `registry['skills'][name] = {...}` not `registry['skills'].append({...})`
- Same applies to `registry['knowledge']`
- When reading, iterate with `.items()` not enumerate

## Counter / Caveats

The registry format may change in future versions. Check the actual file before assuming either format. A defensive approach: detect the type and branch accordingly.
