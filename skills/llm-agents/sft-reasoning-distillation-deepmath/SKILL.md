---
name: sft-reasoning-distillation-deepmath
description: Distill math reasoning from DeepSeek-R1 traces into Qwen2.5-Math-1.5B via SFT on DeepMath-103K.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [sft, distillation, math-reasoning, deepseek-r1]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter4/README.md
imported_at: 2026-04-18T00:00:00Z
---

# SFT Math Reasoning Distillation on DeepMath-103K

## When to use
- Teach a small math model (Qwen2.5-Math-1.5B) complex reasoning via DeepSeek-R1 trace imitation.
- Full pipeline: dataset prep, SFT training, vllm-based generation, evaluation.

## Steps

1. Requirements: Python 3.8+, PyTorch, Transformers, Datasets, vllm; 40GB+ VRAM; 50GB+ disk.

2. Download model and dataset:

```bash
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download --resume-download zwhe99/DeepMath-103K \
    --repo-type dataset --local-dir dataset/DeepMath-103K
huggingface-cli download --resume-download Qwen/Qwen2.5-Math-1.5B \
    --local-dir model/Qwen2.5-Math-1.5B
```

3. Open the notebook and follow the three sections:

```bash
jupyter notebook sft_math.ipynb
```

   - Section 1: Dataset download and preprocessing
   - Section 2: Model loading and SFT training
   - Section 3: Generation and evaluation with vllm

## Pitfalls
- Requires at least 40GB GPU VRAM (A100-80GB or equivalent).
- Reserve at least 50GB disk for model + dataset + checkpoints.

## Source
- Chapter 4 of dive-into-llms - documents/chapter4/README.md
