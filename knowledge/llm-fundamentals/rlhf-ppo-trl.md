---
version: 0.1.0-draft
name: rlhf-ppo-trl
summary: Reinforcement Learning from Human Feedback (RLHF) aligns LLMs to human preferences using a reward model as the environment.
category: llm-fundamentals
tags: [rlhf, ppo, trl, reward-model, kl-divergence]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter11/README.md
imported_at: 2026-04-18T00:00:00Z
---

# RLHF with PPO and TRL Library

## Overview

Reinforcement Learning from Human Feedback (RLHF) aligns LLMs to human preferences using a reward model as the environment. TRL provides PPOTrainer which implements the Rollout-Evaluate-Optimize loop.

## Key Facts

- Three-phase PPO loop: Rollout (generate responses), Evaluate (score with reward model), Optimize (PPO gradient update).
- TRL PPOTrainer requires: policy model (with value head), reference model (frozen copy), reward pipeline, tokenizer.
- KL divergence between policy and frozen reference model is added as negative reward to prevent reward hacking.
- AutoModelForCausalLMWithValueHead: policy model variant that adds a scalar value head for PPO critic.
- Reference model is loaded separately (not shared) to correctly compute KL divergence.
- Typical result: mean sentiment reward increases from ~0.59 (before) to ~2.24 (after PPO) on IMDB task.
- Reference hardware: single A800-80GB; ~35 min training; ~10GB VRAM for GPT-2.

## Taxonomy

RLHF pipeline components:
- SFT model: initial policy
- Reward model: scalar scorer trained on human preference pairs
- PPO policy: SFT model trained via RL
- Reference model: frozen SFT model for KL penalty

TRL key classes:
- PPOConfig: hyperparameters (lr, batch size, etc.)
- PPOTrainer: orchestrates rollout, reward, PPO step
- AutoModelForCausalLMWithValueHead: policy model with value head

## References
- https://github.com/huggingface/trl
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter11
