---
name: torchrun-ddp-training-scaffold
description: Minimal torchrun + DDP scaffold with init/cleanup, per-rank seeding, model-size print, all_reduce aggregation, and rank-0-only logging and checkpointing.
category: ml-ops
tags: [pytorch, ddp, torchrun, distributed-training, multi-gpu, training-loop]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [finetune/utils/training_utils.py, finetune/train_tokenizer.py, finetune/train_predictor.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# torchrun + DDP scaffold for multi-GPU training

## When to use
- You are training a PyTorch model across multiple GPUs on one node.
- You need the standard "launch via torchrun" contract (`LOCAL_RANK`, `RANK`, `WORLD_SIZE` env vars).
- You want a reusable `setup_ddp / cleanup_ddp / set_seed / reduce_tensor / get_model_size` helper set.

## Pattern
Keep DDP plumbing in a `utils/training_utils.py`: initialize the process group with `nccl`, read env vars, set the CUDA device for the local rank, and seed each rank differently to decorrelate data loaders. In the main script, wrap the model in `DDP(... device_ids=[local_rank])`, use a `DistributedSampler`, and only let `rank == 0` touch the logger, checkpoint directory, and stdout summaries. Reduce per-rank metrics with `all_reduce` before printing. End every epoch with `dist.barrier()` so no rank races ahead of a save.

```python
# finetune/utils/training_utils.py
def setup_ddp():
    dist.init_process_group(backend="nccl")
    rank       = int(os.environ["RANK"])
    world_size = int(os.environ["WORLD_SIZE"])
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)
    return rank, world_size, local_rank

def set_seed(seed: int, rank: int = 0):
    actual = seed + rank
    random.seed(actual); np.random.seed(actual); torch.manual_seed(actual)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(actual)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark     = False

# main script
rank, world_size, local_rank = setup_ddp()
set_seed(config['seed'], rank)
model = MyModel.from_pretrained(path).to(f"cuda:{local_rank}")
model = DDP(model, device_ids=[local_rank], find_unused_parameters=False)
# ... training loop ...
dist.barrier()
cleanup_ddp()
```

Launch: `torchrun --standalone --nproc_per_node=NUM_GPUS train.py`.

## Why it works / tradeoffs
`torchrun` sets the env vars and spawns one process per GPU; `DistributedSampler` partitions the dataset deterministically across ranks. Rank-0-only logging prevents duplicate Comet / tensorboard entries and race conditions on the checkpoint file. `find_unused_parameters=False` avoids the extra graph traversal at the cost of forbidding branches that skip parameters. If your validation metric is a sum rather than a mean, remember to reduce the count tensor too, not just the loss sum.

## References
- `finetune/utils/training_utils.py` in Kronos — `setup_ddp`, `cleanup_ddp`, `set_seed`, `reduce_tensor`, `get_model_size`, `format_time`
- `finetune/train_tokenizer.py` and `finetune/train_predictor.py` — end-to-end loops using the scaffold
