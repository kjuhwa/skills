---
version: 0.1.0-draft
name: deepseek-r1-architecture-training
summary: DeepSeek-R1 is a large reasoning model that generates explicit chain-of-thought traces before producing a final answer.
category: llm-fundamentals
tags: [deepseek-r1, reasoning, rl, moe, chain-of-thought]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter4/README.md
imported_at: 2026-04-18T00:00:00Z
---

# DeepSeek-R1 Architecture and Training

## Overview

DeepSeek-R1 is a large reasoning model that generates explicit chain-of-thought traces before producing a final answer. It is trained via GRPO reinforcement learning and its traces are used to distill reasoning into smaller models.

## Key Facts

- DeepSeek-R1 generates long thinking traces (in <think>...</think> tags) before the final answer.
- Training uses GRPO (Group Relative Policy Optimization): a PPO variant without a critic model.
- Reward signal: rule-based (answer correctness + format compliance), no learned reward model.
- DeepSeek-R1-Zero: trained purely from RL (no SFT warmup); exhibits emergent self-verification.
- DeepSeek-R1: adds SFT warmup with human-curated CoT data before RL, then post-training alignment.
- Distillation: traces on DeepMath-103K used as SFT targets for smaller models (Qwen2.5-Math-1.5B, etc.).
- Uses Mixture of Experts (MoE) architecture for compute efficiency.
- Context length: 128K tokens to accommodate long thinking traces.

## Taxonomy

DeepSeek-R1 training stages:
1. Cold start SFT: curated long-CoT examples
2. Reasoning-oriented RL (GRPO): math + code rewards
3. Rejection sampling + SFT: diverse task data
4. RL alignment: helpfulness + harmlessness

## References
- https://github.com/deepseek-ai/DeepSeek-R1
- https://huggingface.co/datasets/zwhe99/DeepMath-103K
