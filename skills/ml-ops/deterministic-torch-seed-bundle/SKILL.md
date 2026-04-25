---
name: deterministic-torch-seed-bundle
description: Five-line block that seeds random / numpy / torch / CUDA / cudnn consistently so benchmarks and regression tests are reproducible run-to-run.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [pytorch, reproducibility, seeding, cudnn, benchmark]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# Deterministic PyTorch Seed Bundle

## When to use
- You compare two inference runs (baseline vs speculative, LoRA A vs B) and need sampling / tie-breaking to be identical.
- You want a single block you can paste at the top of any benchmark or regression test.

## Pattern

```python
import random, numpy as np, torch

random.seed(0)
np.random.seed(0)
torch.manual_seed(0)
torch.cuda.manual_seed_all(0)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False
```

## Why each line matters
- `random.seed` — Python's `random` is used by HF `datasets`, dataset shufflers, many sampling utilities.
- `np.random.seed` — seeds NumPy-backed code paths (e.g. tokenizers, some HF transforms). NumPy's default RNG is still global in pre-1.17 style code.
- `torch.manual_seed` — PyTorch CPU RNG.
- `torch.cuda.manual_seed_all` — every visible CUDA device's RNG (as opposed to `manual_seed` which only hits device 0).
- `cudnn.deterministic = True` — forces deterministic convolution / attention kernels when available.
- `cudnn.benchmark = False` — stops cuDNN from picking the fastest kernel per input shape, which varies across runs.

## Gotchas
- Deterministic cuDNN is *slower*; only enable it for reproducibility runs, not production throughput benchmarks.
- Some ops have no deterministic kernel (e.g., `scatter_add`). Wrap your experiment in `torch.use_deterministic_algorithms(True)` to surface these as errors rather than silent nondeterminism.
- Multiprocess dataloaders need `worker_init_fn` to also seed their own `random` / `numpy` — the parent's seed does not propagate.
- If you also call `random.seed(42)` inside a library (like dflash's benchmark does), the *later* seed wins; double-seeding can mask bugs.
