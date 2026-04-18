---
name: md-corpus-l1-l2-index-with-auto-regen
description: Build a two-tier markdown index over a large MD corpus (skills, notes, docs) so LLMs can discover entries without reading every file. L1 compact + L1 full + per-category L2, regenerated via git hooks after every mutation so the index never goes stale.
category: workflow
tags: [index, markdown, corpus, llm-context, git-hooks, auto-regen, portable]
triggers: [skill registry, knowledge base, MD index, search-before-you-code, corpus discovery]
source_project: skills-hub-bootstrap-v2.5.x
version: 0.1.0
---

# md-corpus-l1-l2-index-with-auto-regen

## Problem

You have a growing corpus of markdown entries (skills, knowledge snippets, design notes — 500+ files). Two competing needs:

1. **LLMs need to find things fast** — but loading every MD into context is ~300 KB of irrelevant text.
2. **The index must stay in sync** — anyone (or any tool) that adds/edits an entry shouldn't have to remember a separate regen step.

A naive single flat index works for small corpora but balloons past ~50 KB and hurts token budget.

## Pattern

Three-tier layout, generated from frontmatter:

```
~/.claude/skills-hub/
├── remote/                        # source of truth (git clone)
│   └── index.json                 # flat catalog (one record per entry)
├── tools/
│   ├── _build_master_index.py     # L1 full  (~310 KB: every entry + desc + tags)
│   ├── _build_master_index_lite.py # L1 compact (~18 KB: 5 reps per category)
│   ├── _build_category_indexes.py  # L2 (per-category INDEX.md)
│   └── precheck.py                 # wraps lint + all three rebuilds
└── indexes/                       # generated artifacts (not committed)
    ├── 00_MASTER_INDEX.md          # L1 full
    ├── 00_MASTER_INDEX_LITE.md     # L1 compact (lead here first)
    └── category_indexes/
        └── <kind>/<category>/INDEX.md   # L2
```

Each generator:
- Reads `index.json`.
- Groups by `(kind, category)`.
- Writes a predictable markdown table so grep/Ctrl-F/LLM can pick what they need.
- Self-relative paths (`Path(__file__).resolve().parent.parent`) so the same script runs from any checkout.

Auto-regen via git hooks in `remote/.git/hooks/`:

```bash
# post-merge, post-commit, post-checkout (all three):
#!/usr/bin/env bash
set -e
PYTHONIOENCODING=utf-8 py -3 "$HOME/.claude/skills-hub/tools/precheck.py" --skip-lint >/dev/null 2>&1 || true
```

Provide an `install-hooks.sh` that recreates them after re-clone. Reference it from the installer (`install.sh`) so fresh installs get hooks automatically.

## When to use

- You're curating a corpus of >100 MD entries that multiple people/tools will query.
- The primary consumer is an LLM (token cost matters → lite + full split).
- Mutations happen via `git commit` / `git merge` / `git checkout` (hooks fire) or through commands that can call the regen explicitly.

## Discovery contract (LLM side)

Teach the LLM in the project's top-level instructions (CLAUDE.md, system prompt, …):

1. For a question like "what skill fits X?", **skim the L1 lite first** — it tells you the shape of the corpus in 18 KB.
2. If lite doesn't answer, Ctrl-F the L1 full.
3. For deeper dives into a single category, open `category_indexes/<kind>/<category>/INDEX.md`.
4. Only read the actual MD body at `remote/<path>` when citing.

## Pitfalls

- **`git reset --hard` bypasses hooks.** Any command in your stack that uses `reset --hard` to jump to a ref (common for "sync to latest" flows) must call the regen explicitly. See pitfall `git-reset-hard-bypasses-all-hooks`.
- **CRLF on Windows breaks YAML frontmatter parsing** for consumer tools (`.gitattributes` with `eol=lf` for command/tool/bin files). See pitfall `claude-code-slash-command-crlf-breaks-yaml-parser`.
- **Index files live under a git-ignored directory** (`indexes/`) or inherit `.gitignore` — they're derived, committing them causes merge noise.
- **Compact (L1 lite) needs a quality score** — don't just alphabetize. Prefer entries with populated description, >= 3 tags, and version. One-entry-categories get included whole; large categories get the top N by quality.

## Example quality score (L1 lite)

```python
score = 0
if description:             score += 3
if tags:                    score += min(len(tags), 5) + 2
if version:                 score += 1
if 80 <= len(description) <= 220: score += 1
if 3 <= len(name_tokens) <= 8:    score += 1
# top-5 per category → 18 KB total
```
