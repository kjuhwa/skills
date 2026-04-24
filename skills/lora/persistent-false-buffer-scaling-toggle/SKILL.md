---
name: persistent-false-buffer-scaling-toggle
description: Enable/disable LoRA via persistent=False buffer mutation, compatible with torch.compile
category: lora
version: 1.0.0
tags: [lora, pytorch, torch-compile, buffer, fine-tuning]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/modules/layers/lora.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Enable/disable LoRA via persistent=False buffer mutation, compatible with torch.compile

## When to use
Use this pattern when you need to toggle LoRA adapters on/off at inference time without triggering a `torch.compile` recompilation. The standard approach of storing a Python `bool` or replacing module attributes causes graph breaks; a `persistent=False` buffer mutated in-place sidesteps that by keeping the tensor graph stable.

Also useful when you need to zero-out LoRA contribution for ablation studies or conditional fine-tuning paths.

## Pattern

### 1. Register the scaling buffer as non-persistent
Non-persistent means it will not be saved in `state_dict()`, which is correct — `scaling` is derived from `alpha/r` and should be recomputed on load.

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, r=8, alpha=16, dropout=0.0):
        super().__init__()
        self.r = r
        self.alpha = alpha

        # Frozen base weight
        self.weight = nn.Parameter(torch.empty(out_features, in_features), requires_grad=False)
        nn.init.kaiming_uniform_(self.weight)

        # LoRA low-rank factors
        self.lora_A = nn.Parameter(torch.zeros(r, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, r))
        nn.init.kaiming_uniform_(self.lora_A)
        nn.init.zeros_(self.lora_B)

        self.dropout = nn.Dropout(p=dropout)

        # Non-persistent scaling buffer — safe for torch.compile
        self.register_buffer("scaling", torch.tensor(alpha / r), persistent=False)
```

### 2. Forward uses the buffer multiplicatively
```python
    def forward(self, x):
        base_out = F.linear(x, self.weight)
        lora_out = F.linear(F.linear(x, self.lora_A), self.lora_B)
        return base_out + self.dropout(lora_out) * self.scaling
```

### 3. Toggle LoRA on/off via in-place fill
```python
    def enable_lora(self):
        self.scaling.fill_(self.alpha / self.r)

    def disable_lora(self):
        self.scaling.fill_(0.0)
```

### 4. Utility to toggle an entire model
```python
def set_lora_enabled(model: nn.Module, enabled: bool):
    for module in model.modules():
        if isinstance(module, LoRALinear):
            if enabled:
                module.enable_lora()
            else:
                module.disable_lora()
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/modules/layers/lora.py:36-80` — full LoRALinear implementation with buffer registration and in-place toggle

## Notes
- `persistent=False` means the buffer is **not** included in `state_dict()`. If you ever checkpoint with LoRA enabled, scaling is not saved — recompute it from `alpha/r` on load (or call `enable_lora()` after loading).
- `fill_()` is an in-place operation; it does not create a new tensor node, which is why it's `torch.compile`-safe.
- Do not use `self.scaling = torch.tensor(...)` inside forward or toggle methods — that replaces the buffer attribute and breaks compile.
