---
version: 0.1.0-draft
name: llamafactory-sft-training
summary: LLaMA-Factory is an open-source training framework supporting SFT, DPO, PPO, and other fine-tuning methods for LLMs and MLLMs.
category: llm-agents
tags: [llamafactory, sft, fine-tuning, qwen, training-infrastructure]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter9/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLaMA-Factory SFT Training Framework

## Overview

LLaMA-Factory is an open-source training framework supporting SFT, DPO, PPO, and other fine-tuning methods for LLMs and MLLMs. It uses YAML-based configuration and supports multi-GPU training via deepspeed.

## Key Facts

- Dataset registration: add entry to data/dataset_info.json with file_name, formatting, columns, and tags.
- ShareGPT format: JSON array of objects with messages (list of role/content dicts) and optional images list.
- Training: CUDA_VISIBLE_DEVICES + FORCE_TORCHRUN=1 + llamafactory-cli train config.yaml
- Inference: llamafactory-cli webchat config.yaml for interactive web chat.
- Key YAML fields: model_name_or_path, dataset, template, cutoff_len, output_dir, per_device_train_batch_size, learning_rate, num_train_epochs.
- Deepspeed ZeRO-3 config (examples/deepspeed/ds_z3_config.json) for large model multi-GPU training.
- Template must match the model: qwen2_vl for Qwen2-VL models.
- eval_strategy: steps with eval_steps for periodic evaluation on a val_size fraction.

## Taxonomy

Supported training stages:
- sft: supervised fine-tuning
- dpo: direct preference optimization
- ppo: reinforcement learning from human feedback
- pt: continued pre-training

Data formats:
- sharegpt: messages list with role/content + optional images
- alpaca: instruction/input/output fields

## References
- https://github.com/hiyouga/LLaMA-Factory
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter9
