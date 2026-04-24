---
name: argbind-function-signature-cli-binding
description: Use argbind to auto-generate CLI flags and YAML config from annotated function signatures
category: training
version: 1.0.0
tags: [argbind, cli, config, training, python]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - scripts/train_voxcpm_finetune.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Use argbind to auto-generate CLI args + YAML config from function signatures

## When to use
Use this pattern in training scripts where you want both CLI flag overrides and YAML config file support without writing argparse boilerplate for every hyperparameter. `argbind` reads the function's type-annotated parameters and default values, exposes them as `--param-name` CLI flags, and merges them with a YAML config at runtime.

Good fit for research training scripts where hyperparameter sets change frequently.

## Pattern

### Install
```bash
pip install argbind
```

### Annotate the training function
```python
import argbind

@argbind.bind(without_prefix=True)
def train(
    model_path: str = "./voxcpm2-2b",
    output_dir: str = "./checkpoints",
    learning_rate: float = 1e-4,
    batch_size: int = 8,
    max_epochs: int = 10,
    use_lora: bool = True,
    lora_r: int = 8,
    lora_alpha: float = 16.0,
    max_batch_tokens: int = 16384,
    seed: int = 42,
):
    """Main training loop — all params auto-exposed as CLI flags."""
    import torch
    from voxcpm.model.voxcpm2 import VoxCPM2Model

    # ... training logic
    pass
```

### Entry point
```python
if __name__ == "__main__":
    args = argbind.parse_args()
    with argbind.scope(args):
        train()
```

### YAML config file
```yaml
# configs/finetune_base.yml
model_path: /data/voxcpm2-2b
output_dir: /runs/finetune_v1
learning_rate: 5e-5
batch_size: 4
max_epochs: 20
use_lora: true
lora_r: 16
```

### Running with YAML + CLI overrides
```bash
# Use YAML, override one field from CLI
python train_voxcpm_finetune.py \
    --args.load configs/finetune_base.yml \
    --learning_rate 1e-4   # overrides the YAML value
```

### How argbind resolves values
1. Function default → lowest priority
2. YAML config file (`--args.load`)
3. CLI flag override → highest priority

### Type hints drive validation
```python
# argbind uses type hints for parsing:
# str  → raw string
# int  → int()
# float → float()
# bool → "true"/"false" strings mapped to True/False
# list → comma-separated or repeated flag

@argbind.bind(without_prefix=True)
def train(target_modules: list = ["q_proj", "v_proj"]):
    pass
# CLI: --target_modules q_proj v_proj
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `scripts/train_voxcpm_finetune.py:44-72` — `@argbind.bind` decoration and `parse_args()` entry point

## Notes
- `without_prefix=True` means flags appear as `--learning_rate` rather than `--train.learning_rate`; omit it for namespace isolation in multi-function scripts.
- `argbind` does not support positional arguments — all parameters must have defaults.
- Confidence is medium because argbind is less widely known than alternatives (Hydra, simple-parsing); evaluate whether its conventions match your team's workflow before adopting.
