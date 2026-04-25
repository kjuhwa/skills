---
version: 0.1.0-draft
name: ddp-no-sync-gradient-accumulation
summary: Use DDP no_sync context manager on gradient accumulation steps to avoid redundant all-reduce syncs on intermediate micro-batches
category: training
tags: [ddp, gradient-accumulation, distributed, pytorch, performance]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/training/accelerator.py
imported_at: 2026-04-18T00:00:00Z
---

# DDP no_sync context manager on gradient accumulation steps

When training with PyTorch DDP and gradient accumulation (accumulating gradients over N micro-batches before calling `optimizer.step()`), the default behavior is to perform an all-reduce gradient synchronization after every `.backward()` call — including the intermediate accumulation steps. This is wasteful: the intermediate gradients will be overwritten by the next `.backward()` call, so synchronizing them across GPUs accomplishes nothing and wastes inter-GPU bandwidth.

The fix is to use `model.no_sync()` as a context manager for all but the last micro-batch in each accumulation window. The `no_sync()` context defers the all-reduce to the next `.backward()` call that is executed outside the context (i.e., the final micro-batch step that precedes `optimizer.step()`).

```python
for step, batch in enumerate(dataloader):
    is_last_micro_batch = (step + 1) % accumulation_steps == 0
    ctx = contextlib.nullcontext() if is_last_micro_batch else model.no_sync()
    with ctx:
        loss = model(batch) / accumulation_steps
        scaler.scale(loss).backward()
    if is_last_micro_batch:
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad()
```

This optimization matters most for setups with 8 or more GPUs where all-reduce latency is significant relative to compute time. On a single GPU or 2-GPU setup, the overhead is negligible and the optimization is not worth the code complexity.

## Why it matters
Without `no_sync`, gradient accumulation with DDP produces correct results but at reduced throughput — the all-reduce overhead scales with accumulation_steps and number of GPUs. For a 64-GPU run with accumulation_steps=4, this can account for 20-30% of wall-clock training time.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/training/accelerator.py:51` — `no_sync` usage within the accumulation loop context
