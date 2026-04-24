---
name: config-json-architecture-dispatch
description: Auto-detect model version from config.json architecture field and dispatch to the correct model class
category: model-loading
version: 1.0.0
tags: [model-loading, config, dispatch, versioning, pytorch]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/core.py
  - src/voxcpm/cli.py
  - scripts/train_voxcpm_finetune.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Auto-detect model version from config.json and dispatch to the correct model class

## When to use
Use this pattern when a model directory may contain different architecture generations and the loading code must stay backward-compatible. Instead of requiring callers to pass an explicit version flag, read the architecture string from the model's own `config.json` and dispatch automatically.

Useful in both inference entry points (CLI / web app) and training scripts that need to instantiate the right class before applying LoRA configs.

## Pattern

### 1. Read architecture from config.json
```python
import json
from pathlib import Path

def _detect_architecture(model_path: str) -> str:
    config_path = Path(model_path) / "config.json"
    with open(config_path) as f:
        config = json.load(f)
    return config.get("architecture", "voxcpm").lower()
```

### 2. Map architecture string to model class
```python
from voxcpm.model.voxcpm import VoxCPMModel
from voxcpm.model.voxcpm2 import VoxCPM2Model

_ARCH_TO_CLASS = {
    "voxcpm":  VoxCPMModel,
    "voxcpm2": VoxCPM2Model,
}

def _get_model_class(arch: str):
    cls = _ARCH_TO_CLASS.get(arch)
    if cls is None:
        raise ValueError(f"Unknown architecture: {arch!r}. Expected one of {list(_ARCH_TO_CLASS)}")
    return cls
```

### 3. Dispatch at load time
```python
import logging
logger = logging.getLogger(__name__)

def load_model(model_path: str, lora_config=None):
    arch = _detect_architecture(model_path)
    model_cls = _get_model_class(arch)
    logger.info("Detected architecture: %s → using %s", arch, model_cls.__name__)
    return model_cls.from_local(model_path, lora_config=lora_config)
```

### 4. Apply LoRA config version-agnostically
The LoRA config is passed identically regardless of version; each model class handles its own interpretation:
```python
# Training script pattern (scripts/train_voxcpm_finetune.py lines 93-101)
arch = _detect_architecture(args.model_path)
LoRAConfig = LoRAConfigV2 if arch == "voxcpm2" else LoRAConfigV1
lora_cfg = LoRAConfig(**lora_kwargs) if args.use_lora else None
model = load_model(args.model_path, lora_config=lora_cfg)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/core.py:57-81` — central dispatch and config reading
  - `src/voxcpm/cli.py:93-118` — CLI entry point using dispatch
  - `scripts/train_voxcpm_finetune.py:93-101` — training-time version-aware LoRA selection

## Notes
- Always `.lower()` the architecture string before comparing — config files written by different tools may differ in case.
- Default to the older architecture (`"voxcpm"`) when the key is absent; this preserves backward compatibility with checkpoints that pre-date the versioning field.
- Log the detected architecture at INFO level so users can verify which model class was selected without reading source.
