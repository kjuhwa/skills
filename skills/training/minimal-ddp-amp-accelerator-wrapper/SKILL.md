---
name: minimal-ddp-amp-accelerator-wrapper
description: Minimal DDP + AMP training wrapper without HuggingFace Accelerate dependency
category: training
version: 1.0.0
tags: [ddp, amp, training, pytorch, distributed]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/training/accelerator.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Minimal DDP + AMP wrapper without HF Accelerate dependency

## When to use
Use this pattern when you want distributed training (DDP) and mixed-precision (AMP) without pulling in the full HuggingFace Accelerate stack. This is appropriate for research codebases where you control the training loop completely and want to minimize dependencies or customize gradient scaling behavior.

## Pattern

### Detect distributed environment
```python
import os
import torch
import torch.distributed as dist

def is_distributed() -> bool:
    return int(os.environ.get("WORLD_SIZE", "1")) > 1

def local_rank() -> int:
    return int(os.environ.get("LOCAL_RANK", "0"))

def global_rank() -> int:
    return int(os.environ.get("RANK", "0"))

def world_size() -> int:
    return int(os.environ.get("WORLD_SIZE", "1"))
```

### Accelerator class
```python
class Accelerator:
    def __init__(self, use_amp: bool = True):
        self.use_amp = use_amp
        self._distributed = is_distributed()

        if self._distributed:
            torch.cuda.set_device(local_rank())
            dist.init_process_group(backend="nccl")

        if use_amp:
            self.scaler = torch.amp.GradScaler("cuda")
        else:
            self.scaler = _DummyScaler()

    @property
    def device(self) -> torch.device:
        return torch.device("cuda", local_rank()) if torch.cuda.is_available() \
               else torch.device("cpu")

    @property
    def is_main_process(self) -> bool:
        return global_rank() == 0

    def prepare_model(self, model: torch.nn.Module) -> torch.nn.Module:
        model = model.to(self.device)
        if self._distributed:
            model = torch.nn.parallel.DistributedDataParallel(
                model, device_ids=[local_rank()]
            )
        return model

    def backward(self, loss: torch.Tensor):
        self.scaler.scale(loss).backward()

    def step(self, optimizer):
        self.scaler.step(optimizer)
        self.scaler.update()
        optimizer.zero_grad()

    def barrier(self):
        if self._distributed:
            dist.barrier()

    def all_reduce(self, tensor: torch.Tensor, op=dist.ReduceOp.SUM) -> torch.Tensor:
        if self._distributed:
            dist.all_reduce(tensor, op=op)
        return tensor

    def __enter__(self):
        torch.cuda.set_device(local_rank())
        return self

    def __exit__(self, *args):
        if self._distributed:
            dist.destroy_process_group()
```

### Dummy scaler for non-AMP
```python
class _DummyScaler:
    """No-op scaler used when AMP is disabled."""
    def scale(self, loss):
        return loss
    def step(self, optimizer):
        optimizer.step()
    def update(self):
        pass
    def unscale_(self, optimizer):
        pass
```

### Training loop usage
```python
with Accelerator(use_amp=True) as acc:
    model = acc.prepare_model(MyModel())
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

    for batch in dataloader:
        with torch.amp.autocast("cuda"):
            loss = model(batch)
        acc.backward(loss)
        acc.step(optimizer)

    acc.barrier()
    if acc.is_main_process:
        torch.save(model.state_dict(), "checkpoint.pt")
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/training/accelerator.py:1-80` — full Accelerator implementation with DDP init, AMP scaler, barrier, and all_reduce

## Notes
- Launch with `torchrun --nproc_per_node=N train.py` — it sets `WORLD_SIZE`, `RANK`, `LOCAL_RANK` automatically.
- The `DummyScaler` makes single-GPU code identical to multi-GPU code — no `if distributed:` branches in the loop.
- Do not mix this with HF Accelerate in the same process; they both call `dist.init_process_group` and will conflict.
