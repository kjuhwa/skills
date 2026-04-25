---
name: easyjailbreak-pair-attack-pipeline
description: Use EasyJailbreak to run the PAIR attack against a target LLM using an attack model, target model, and evaluator.
category: security
version: 1.0.0
version_origin: extracted
tags: [jailbreak, easyjailbreak, pair, llm-safety, red-team]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter6/README.md
imported_at: 2026-04-18T00:00:00Z
---

# EasyJailbreak PAIR Attack Pipeline

## When to use
- Researching LLM safety via automated jailbreak attacks.
- PAIR: attack LLM iteratively refines jailbreak prompts against a target LLM.
- Reproducible framework with Selector, Mutator, Constraint, Evaluator modules.

## Steps

1. Install EasyJailbreak:

```bash
pip install easyjailbreak
```

2. Load models:

```python
from easyjailbreak.models.huggingface_model import from_pretrained, HuggingfaceModel
attack_model = from_pretrained('lmsys/vicuna-13b-v1.5', model_name='vicuna_v1.1')
target_model = HuggingfaceModel('meta-llama/Llama-2-7b-chat-hf', model_name='llama-2')
```

3. Load dataset and initialize seeds:

```python
from easyjailbreak.datasets import JailbreakDataset
from easyjailbreak.seed.seed_random import SeedRandom
dataset = JailbreakDataset(dataset='AdvBench')
seeder = SeedRandom()
seeder.new_seeds()
```

4. Run PAIR attack:

```python
from easyjailbreak.attacker.PAIR_chao_2023 import PAIR
attacker = PAIR(
    attack_model=attack_model,
    target_model=target_model,
    eval_model=eval_model,
    jailbreak_datasets=dataset
)
attacker.attack(save_path='results.jsonl')
```

## Pitfalls
- PAIR requires three models (attack, target, eval); GPU memory scales accordingly.
- GPT-4 as eval model requires OpenAI API access (VPN in China).

## Source
- Chapter 6 of dive-into-llms - documents/chapter6/README.md
