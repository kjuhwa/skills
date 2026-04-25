---
version: 0.1.0-draft
name: token-budget-length-filter
summary: VoxCPM drops training samples exceeding max_batch_tokens/batch_size; estimated from text_len + ceil(duration*fps/patch_size) + overhead
category: training
tags: [training, data-filtering, oom, budget, sequence-length]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - scripts/train_voxcpm_finetune.py
  - src/voxcpm/training/data.py
imported_at: 2026-04-18T00:00:00Z
---

# Drop samples exceeding max_batch_tokens / batch_size budget

VoxCPM's training data loader filters out samples whose estimated token length exceeds `max_batch_tokens / batch_size` before batching. The token length estimate for a single sample is: `text_len + ceil(audio_duration_seconds * fps / patch_size) + overhead_constant`. This estimate avoids actually encoding the audio (which would require GPU) by approximating the number of audio patches from duration, frame rate, and patch size.

Filtering at the dataset level — dropping samples before they enter the batch — is more efficient than padding to the worst-case maximum length, which would waste computation on padding positions. It also prevents OOM errors that would crash the training run mid-epoch, which is especially costly for multi-GPU training where a single worker OOM kills all processes.

The trade-off is data loss: samples with unusually long audio (>30 seconds, for example) are silently dropped. For training data curated to have audio under 30 seconds, this rarely affects coverage. For fine-tuning on long-form data, increase `max_batch_tokens` accordingly or add a pre-processing step that splits long samples.

## Why it matters
The formula `text_len + ceil(duration * fps / patch_size) + overhead` must be correctly tuned for your AudioVAE's frame rate and patch size. Using VoxCPM2's AudioVAE V2 defaults: fps=50, patch_size=1, overhead=10 gives a reasonable starting estimate. Miscalibrating this formula causes either frequent OOM (underestimate) or excessive data filtering (overestimate).

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `scripts/train_voxcpm_finetune.py:138-151` — per-sample length estimate and filter condition
  - `src/voxcpm/training/data.py:64-120` — dataset class with `__getitem__` skipping logic for over-budget samples
