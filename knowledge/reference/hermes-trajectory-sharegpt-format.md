---
version: 0.1.0-draft
name: hermes-trajectory-sharegpt-format
summary: Save agent conversations as ShareGPT-format JSONL with completed/failed split for RL training datasets.
category: reference
tags: [trajectory, sharegpt, rl-training, jsonl, datasets]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Trajectory Saving — ShareGPT JSONL Format

Hermes' trajectory persistence (used for RL training data collection) follows the ShareGPT convention with a few pragmatic additions.

## File split by outcome

```python
if filename is None:
    filename = "trajectory_samples.jsonl" if completed else "failed_trajectories.jsonl"
```

Completed conversations and failed ones go to separate JSONL files. This makes dataset curation trivial: just load `trajectory_samples.jsonl` for supervised training, and use `failed_trajectories.jsonl` for failure-mode analysis or negative-example mining.

## Entry shape

Each JSONL line:

```json
{
  "conversations": [
    {"from": "system", "value": "..."},
    {"from": "human", "value": "..."},
    {"from": "gpt", "value": "...", "tool_calls": [...]},
    {"from": "tool", "value": "...", "tool_call_id": "..."},
    ...
  ],
  "timestamp": "2026-04-18T10:00:00",
  "model": "anthropic/claude-opus-4.6",
  "completed": true
}
```

`from` is the ShareGPT role convention — `"human"`, `"gpt"`, `"system"`, `"tool"` — which is what most datasets.load_dataset() consumers expect.

## Reasoning tag conversion

Hermes uses `<REASONING_SCRATCHPAD>...</REASONING_SCRATCHPAD>` in live prompts (so it's distinctive and unlikely to collide with user text) but converts to `<think>...</think>` when saving trajectories (the convention most RL training frameworks expect):

```python
def convert_scratchpad_to_think(content: str) -> str:
    if not content or "<REASONING_SCRATCHPAD>" not in content:
        return content
    return content.replace("<REASONING_SCRATCHPAD>", "<think>") \
                  .replace("</REASONING_SCRATCHPAD>", "</think>")
```

## Incomplete reasoning detection

Truncated conversations sometimes have `<REASONING_SCRATCHPAD>` with no closing tag. Detect before saving so you can drop or repair:

```python
def has_incomplete_scratchpad(content: str) -> bool:
    return (content and
            "<REASONING_SCRATCHPAD>" in content and
            "</REASONING_SCRATCHPAD>" not in content)
```

## Append-only write

```python
with open(filename, "a", encoding="utf-8") as f:
    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
```

JSONL is append-only; no need for locks unless you're also compacting. `ensure_ascii=False` preserves non-Latin characters as themselves rather than `\uXXXX` escapes (smaller files, easier grep).

## Tool stats schema normalization

`batch_runner.py` normalizes `tool_stats` across runs to a stable schema so HuggingFace datasets can load the JSONL without schema-mismatch errors. Tools that weren't used in a given rollout get `{'count': 0, 'success': 0, 'failure': 0}` — every entry has all tool keys.

## Reference

- `agent/trajectory.py` — save helpers
- `batch_runner.py:60-130` — stats normalization
- `tinker-atropos/` — RL training integration that consumes these files
