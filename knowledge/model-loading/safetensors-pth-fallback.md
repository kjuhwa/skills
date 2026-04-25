---
version: 0.1.0-draft
name: safetensors-pth-fallback
summary: VoxCPM loaders try audiovae.safetensors first, fall back to audiovae.pth; new exports should prefer safetensors for safety and speed
category: model-loading
tags: [safetensors, checkpoint, model-loading, fallback, compatibility]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
  - scripts/train_voxcpm_finetune.py
imported_at: 2026-04-18T00:00:00Z
---

# Prefer safetensors, fall back to .pth

VoxCPM's model loader implements a try-first-then-fallback pattern for AudioVAE checkpoint loading: it first attempts to load `audiovae.safetensors` from the model directory. If that file does not exist, it falls back to `audiovae.pth`. This maintains backward compatibility with older checkpoint releases (which shipped only `.pth` files) while preferring the safer and faster safetensors format for new checkpoints.

The safetensors format is preferred because it cannot execute arbitrary Python code during deserialization (unlike pickle-based `.pth` files), making it safe to load from untrusted sources. It also supports memory-mapped loading, which is faster and has lower peak memory usage for large models.

New checkpoints produced by fine-tuning or training scripts should export AudioVAE weights in safetensors format. The training script (`train_voxcpm_finetune.py`) uses `safetensors.torch.save_file()` for new exports.

## Why it matters
If you distribute a fine-tuned VoxCPM checkpoint and want users to be able to load it with older VoxCPM code that only checks for `.pth`, include both formats. If your checkpoint directory has neither file (e.g., a corrupted download), the fallback chain will raise `FileNotFoundError` with a clear message naming both expected paths. Check both paths exist before distributing.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:1100-1120` — try/except pattern for safetensors-first loading with `.pth` fallback
  - `scripts/train_voxcpm_finetune.py:22-28` — `safetensors.torch.save_file()` usage for new checkpoint export
