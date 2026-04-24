---
name: version-aware-lora-config-selection
description: Select the correct LoRAConfig class based on detected model architecture version at runtime
category: training
version: 1.0.0
tags: [lora, training, versioning, config, fine-tuning]
confidence: high
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

# Select LoRAConfig class based on detected model architecture at runtime

## When to use
Use this pattern when your LoRA fine-tuning script must support multiple model generations (V1, V2) that have different LoRA config schemas. Reading `config.json` once at script startup and selecting the correct dataclass avoids maintaining two separate training scripts or requiring users to specify the version manually.

Combines naturally with the `config-json-architecture-dispatch` skill for model class selection.

## Pattern

### Define version-specific LoRAConfig classes
```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class LoRAConfigV1:
    """LoRA config for VoxCPM V1 / V1.5 models."""
    r: int = 8
    alpha: float = 16.0
    dropout: float = 0.0
    enable_lm: bool = True          # apply LoRA to language model
    target_modules: list = field(default_factory=lambda: ["q_proj", "v_proj"])

@dataclass
class LoRAConfigV2:
    """LoRA config for VoxCPM V2 models — adds DiT and projection support."""
    r: int = 8
    alpha: float = 16.0
    dropout: float = 0.0
    enable_lm: bool = True          # apply LoRA to language model
    enable_dit: bool = True         # apply LoRA to DiT diffusion transformer
    enable_proj: bool = False       # apply LoRA to projection layers (slower, rarely needed)
    target_modules: list = field(default_factory=lambda: ["q_proj", "k_proj", "v_proj", "o_proj"])
```

### Read architecture and select config class
```python
import json
from pathlib import Path

_ARCH_TO_LORA_CONFIG = {
    "voxcpm":  LoRAConfigV1,
    "voxcpm2": LoRAConfigV2,
}

def select_lora_config_class(model_path: str):
    """Return the LoRAConfig class appropriate for the model at model_path."""
    config_path = Path(model_path) / "config.json"
    with open(config_path) as f:
        arch = json.load(f).get("architecture", "voxcpm").lower()

    cls = _ARCH_TO_LORA_CONFIG.get(arch)
    if cls is None:
        raise ValueError(f"No LoRAConfig for architecture: {arch!r}")
    return cls
```

### Instantiate and apply
```python
def build_model_with_lora(
    model_path: str,
    lora_kwargs: dict,
    use_lora: bool = True,
):
    # 1. Detect architecture and pick matching classes
    arch = _detect_arch(model_path)
    ModelClass    = _ARCH_TO_MODEL[arch]
    LoRAConfigCls = _ARCH_TO_LORA_CONFIG[arch]

    # 2. Build LoRA config (or None for full fine-tuning)
    lora_config = LoRAConfigCls(**lora_kwargs) if use_lora else None

    # 3. Load model with config injected
    model = ModelClass.from_local(model_path, lora_config=lora_config)
    return model

# Training script entry
model = build_model_with_lora(
    model_path=args.model_path,
    lora_kwargs={"r": 16, "alpha": 32.0, "enable_dit": True},
    use_lora=args.use_lora,
)
```

### Handling unknown future versions gracefully
```python
def select_lora_config_class(model_path: str, default_arch: str = "voxcpm2"):
    arch = _read_arch(model_path)
    cls = _ARCH_TO_LORA_CONFIG.get(arch)
    if cls is None:
        import warnings
        warnings.warn(
            f"Unknown architecture {arch!r}; falling back to LoRAConfigV2. "
            "Update _ARCH_TO_LORA_CONFIG if this is a new version.",
            stacklevel=2,
        )
        cls = _ARCH_TO_LORA_CONFIG[default_arch]
    return cls
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `scripts/train_voxcpm_finetune.py:93-102` — runtime architecture detection and LoRAConfig dispatch

## Notes
- Read `config.json` exactly once at script startup; cache the result to avoid repeated disk reads in long training loops.
- V1 and V2 LoRAConfig fields are intentionally not unified into a single class — keeping them separate makes it obvious when a field is V2-only.
- When `use_lora=False`, pass `lora_config=None` to the model constructor; most models interpret this as standard full fine-tuning.
