---
name: gui-agent-sft-qwen2vl-os-kairos
description: SFT Qwen2-VL-7B on the OS-Kairos GUI dataset using LLaMA-Factory, converting data to ShareGPT format, and running inference.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [gui-agent, qwen2-vl, sft, llamafactory, os-kairos]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter9/README.md
imported_at: 2026-04-18T00:00:00Z
---

# GUI Agent SFT: Qwen2-VL-7B on OS-Kairos

## When to use
- Build a GUI agent that predicts click/type/scroll actions from screenshots.
- SFT-training Qwen2-VL-7B on OS-Kairos dataset via LLaMA-Factory.
- Model also scores its own action confidence (1-5).

## Steps

1. Download OS-Kairos dataset from https://github.com/Wuzheng02/OS-Kairos

2. Download Qwen2-VL-7B-Instruct from HuggingFace.

3. Clone LLaMA-Factory from https://github.com/hiyouga/LLaMA-Factory/

4. Convert OS-Kairos to ShareGPT format via get_sharpgpt.py (see chapter9/README.md for full prompt template).

5. Register dataset in LLaMA-Factory data/dataset_info.json:

```json
"Karios": {
  "file_name": "Karios_qwenscore.json",
  "formatting": "sharegpt",
  "columns": {"messages": "messages", "images": "images"},
  "tags": {"role_tag": "role", "content_tag": "content", "user_tag": "user", "assistant_tag": "assistant"}
}
```

6. Launch training (requires 3x A100-80GB):

```bash
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 FORCE_TORCHRUN=1 \
  llamafactory-cli train examples/train_full/qwen2vl_full_sft.yaml
```

7. Run inference:

```bash
CUDA_VISIBLE_DEVICES=0 FORCE_TORCHRUN=1 \
  llamafactory-cli webchat examples/inference/qwen2_vl.yaml
```

## Example output

```
action: CLICK <point>[[454,87]]</point>
score: 5
```

A lower score signals the task is beyond agent capability and human intervention is needed.

## Pitfalls
- Training requires at least 3x 80GB A100 GPUs.
- model_name_or_path in YAML files must point to local model/checkpoint paths.

## Source
- Chapter 9 of dive-into-llms - documents/chapter9/README.md
