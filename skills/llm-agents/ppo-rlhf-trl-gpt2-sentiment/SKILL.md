---
name: ppo-rlhf-trl-gpt2-sentiment
description: Fine-tune GPT-2 with PPO RLHF using TRL to generate positive IMDB reviews, with DistilBERT as the sentiment reward model.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [rlhf, ppo, trl, gpt-2, sentiment]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter11/README.md
imported_at: 2026-04-18T00:00:00Z
---

# PPO RLHF with TRL: GPT-2 Sentiment Fine-Tuning

## When to use
- Fine-tune an LLM using reinforcement learning from a scalar reward signal.
- TRL PPOTrainer with a sentiment classifier as the reward.
- Reference: single A800-80GB, ~35 min training, ~10GB VRAM.

## Steps

1. Download model and dataset:

```bash
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download --resume-download stanfordnlp/imdb --local-dir dataset/imdb --repo-type dataset
huggingface-cli download --resume-download lvwerra/gpt2-imdb --local-dir model/gpt2-imdb
huggingface-cli download --resume-download lvwerra/distilbert-imdb --local-dir model/distilbert-imdb
```

2. Configure PPO training:

```python
from trl import PPOConfig, PPOTrainer, AutoModelForCausalLMWithValueHead
from transformers import AutoTokenizer, pipeline

config = PPOConfig(model_name='model/gpt2-imdb', learning_rate=1.41e-5)
model     = AutoModelForCausalLMWithValueHead.from_pretrained(config.model_name)
ref_model = AutoModelForCausalLMWithValueHead.from_pretrained(config.model_name)
tokenizer = AutoTokenizer.from_pretrained(config.model_name)
tokenizer.pad_token = tokenizer.eos_token
```

3. Load sentiment reward model:

```python
sentiment_pipe = pipeline('sentiment-analysis', model='model/distilbert-imdb', device=0)
```

4. PPO training loop (Rollout, Evaluate, Optimize):

```python
for epoch, batch in enumerate(ppo_trainer.dataloader):
    response_tensors = [ppo_trainer.generate(q, **gen_kwargs) for q in batch['input_ids']]
    texts = [q + r for q, r in zip(batch['query'], batch['response'])]
    rewards = [torch.tensor(o['score']) for out in sentiment_pipe(texts)
               for o in out if o['label'] == 'POSITIVE']
    stats = ppo_trainer.step(batch['input_ids'], response_tensors, rewards)
```

5. Save the fine-tuned model:

```python
model.save_pretrained('model/gpt2-imdb-pos-v2')
tokenizer.save_pretrained('model/gpt2-imdb-pos-v2')
```

## Example

Before PPO: mean reward ~0.59. After PPO: mean reward ~2.24.

## Pitfalls
- KL divergence between policy and reference model is added as auxiliary reward to prevent reward hacking.
- ref_model is loaded separately (not shared) to correctly compute KL divergence.

## Source
- Chapter 11 of dive-into-llms - documents/chapter11/README.md
