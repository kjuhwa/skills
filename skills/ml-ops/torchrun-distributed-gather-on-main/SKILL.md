---
name: torchrun-distributed-gather-on-main
description: Minimal torchrun distributed helpers — init from RANK env, shard work by rank across all indices, gather Python objects onto rank 0 for final aggregation / print.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [pytorch, distributed, torchrun, rank, gather]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# torchrun Distributed Helpers + Rank-Sharded Loop

## When to use
- You want a distributed inference / benchmark script that also works with `python script.py` (single-process) without branching.
- You shard a list of prompts across ranks and need the final results back on rank 0 for summary printing.

## Helpers

```python
def _env_int(name, default):
    return int(os.environ.get(name, default))

def _dist_init(torch_dist):
    if "RANK" not in os.environ:
        warnings.warn("RANK not set. Skipping distributed initialization.")
        return                                   # graceful fallback for `python script.py`
    torch_dist.init_process_group(backend="nccl", init_method="env://")

def _dist_size():       return _env_int("WORLD_SIZE", 1)
def _dist_rank():       return _env_int("RANK", 0)
def _dist_local_rank(): return _env_int("LOCAL_RANK", 0)
def _dist_is_main():    return _dist_rank() == 0

def _dist_gather(torch_dist, obj, dst=0):
    if not torch_dist.is_initialized():
        return [obj]                             # single-process path
    if _dist_is_main():
        objs = [None for _ in range(_dist_size())]
        torch_dist.gather_object(obj, objs, dst=dst)
        return objs
    torch_dist.gather_object(obj, dst=dst)
    return None
```

## Rank-sharded loop

```python
_dist_init(torch_dist)
torch.cuda.set_device(_dist_local_rank())
device = torch.device(f"cuda:{_dist_local_rank()}")

responses = []
indices = range(_dist_rank(), len(dataset), _dist_size())   # stride-by-world-size shard
for idx in tqdm(indices, disable=not _dist_is_main()):       # only rank 0 shows the bar
    responses.append(run_one(dataset[idx]))

if _dist_size() > 1:
    responses = _dist_gather(torch_dist, responses, dst=0)
    if not _dist_is_main():
        return                                              # non-main exits here
    responses = list(itertools.chain(*responses))           # flatten per-rank lists

print_summary(responses)
```

## Why this shape
- Stride-by-world-size (`range(rank, n, world_size)`) is load-balanced when samples are roughly uniform, and every index maps to exactly one rank with no gather-lists bookkeeping.
- `tqdm(..., disable=not _dist_is_main())` silences non-main processes so the terminal is readable.
- `gather_object` (not `all_gather`) keeps results only on rank 0 — avoids O(world_size * objects) memory everywhere.
- `_dist_init` quietly no-ops without `RANK`, so the same script runs under `python`, `python -m torch.distributed.run`, or `torchrun`.

## Gotchas
- `init_method="env://"` requires `MASTER_ADDR`, `MASTER_PORT`, `RANK`, `WORLD_SIZE`, `LOCAL_RANK` — `torchrun` sets them all.
- After `torch.cuda.set_device(local_rank)` you must create tensors on `cuda:{local_rank}`, not the default `cuda:0`, or you'll silently funnel all work through GPU 0.
- `gather_object` pickles — large response objects will blow up serialization. For big tensors, do a `all_reduce` / file-based gather instead.
