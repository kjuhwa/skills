---
version: 0.1.0-draft
name: llm-math-reasoning-distillation
summary: Small math models (e.g.
category: llm-fundamentals
tags: [math-reasoning, sft, distillation, deepseek-r1, qwen2.5-math]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter4/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Math Reasoning via Distillation from DeepSeek-R1

## Overview

Small math models (e.g. Qwen2.5-Math-1.5B) can be taught complex chain-of-thought reasoning by imitating DeepSeek-R1 generated traces via SFT on the DeepMath-103K dataset.

## Key Facts

- DeepMath-103K: 103K math problems with DeepSeek-R1-generated thinking traces; difficulty levels 0-9.
- Qwen2.5-Math-1.5B: 1.5B parameter model specialized for math; base for distillation.
- Training requires at least 40GB GPU VRAM (A100-80GB recommended).
- Reserve at least 50GB free disk: model weights + dataset + checkpoints.
- vllm is used for fast batch generation during evaluation.
- Use HF_ENDPOINT=https://hf-mirror.com for all HuggingFace downloads in China.

## Taxonomy

Pipeline stages:
1. Data: download DeepMath-103K, filter by difficulty, tokenize
2. Train: SFT with cross-entropy on DeepSeek-R1 thinking traces
3. Evaluate: vllm batch generate, score with math answer checker

## References
- https://huggingface.co/datasets/zwhe99/DeepMath-103K
- https://huggingface.co/Qwen/Qwen2.5-Math-1.5B
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter4
