---
version: 0.1.0-draft
name: voxcpm-lora-target-module-configuration
summary: VoxCPM2 LoRA targets q/k/v/o projections on both the LM and DiT components; enable_proj is rarely needed and slows training
category: lora
tags: [lora, fine-tuning, configuration, tts, voxcpm]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
---

# LoRA target modules: q/v/k/o on LM and DiT, optional proj layers

VoxCPM2's `LoRAConfigV2` exposes three flags that control which parts of the model receive LoRA adapters: `enable_lm` (applies LoRA to the language model's attention layers), `enable_dit` (applies LoRA to the LocDiT diffusion transformer's attention layers), and `enable_proj` (applies LoRA to linear projection layers in both components). The default recommended configuration is `enable_lm=True, enable_dit=True, enable_proj=False`.

The target modules within each component are the standard attention projections: `q_proj`, `k_proj`, `v_proj`, and `o_proj`. This follows the pattern established by LLaMA-style LoRA fine-tuning where targeting all four projections provides better adaptation than targeting only q and v. Enabling `enable_proj=False` keeps the MLP feed-forward layers frozen, which is usually sufficient for voice style adaptation and significantly reduces trainable parameter count.

Setting `enable_proj=True` roughly doubles the number of LoRA parameters and slows training proportionally. It is only necessary for tasks that require deep semantic adaptation (e.g., adapting to a completely new language family not represented in training data).

## Why it matters
Too few LoRA targets (only q/v in LM, not DiT) leaves the diffusion model untuned, which limits voice adaptation. Too many (all projections including MLPs) wastes GPU memory and compute for marginal quality gain in typical fine-tuning scenarios. The `enable_lm=True, enable_dit=True, enable_proj=False` default is a validated starting point.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:128-142` — `LoRAConfigV2` dataclass with `enable_lm`, `enable_dit`, `enable_proj` flags and target module lists
