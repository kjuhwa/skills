---
name: linear-interpolation-target-layer-ids
description: Pick N evenly-spaced target-transformer layer indices to feed into a smaller draft model when you do not have a hand-picked layer map.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [speculative-decoding, layer-selection, draft-model, hyperparameters]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model.py
imported_at: 2026-04-18T00:00:00Z
---

# Default Target-Layer IDs for a Draft Model

## When to use
- Your draft model consumes hidden states from `num_draft_layers` of the target transformer and you do not have a trained / calibrated mapping.
- You need a deterministic, architecture-agnostic fallback that interpolates linearly between shallow and deep target layers while reserving a few layers at each end.

## Rule

```python
def build_target_layer_ids(num_target_layers: int, num_draft_layers: int):
    if num_draft_layers == 1:
        return [num_target_layers // 2]           # single-layer draft → middle layer
    start, end = 1, num_target_layers - 3         # skip 1 input, 3 tail layers
    span = end - start
    return [
        int(round(start + (i * span) / (num_draft_layers - 1)))
        for i in range(num_draft_layers)
    ]
```

## Examples

| `num_target_layers` | `num_draft_layers` | Result |
|---|---|---|
| 28 | 1 | `[14]` |
| 28 | 2 | `[1, 25]` |
| 28 | 4 | `[1, 9, 17, 25]` |
| 48 | 6 | `[1, 10, 19, 28, 36, 45]` |

## Why skip ends
- Layer 0 usually carries lexical/embedding residue and is a poor mid-level feature source.
- Last 2–3 layers are specialized for the final logit projection and already implicit in `lm_head`; re-feeding them into the draft is mostly redundant.

## Gotchas
- Override with a calibrated `target_layer_ids` in config whenever you have one — this function is only a *reasonable default*, not optimal.
- Produces strictly increasing IDs; some draft implementations expect that invariant for concatenation order.
