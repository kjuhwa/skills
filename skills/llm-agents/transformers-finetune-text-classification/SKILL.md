---
name: transformers-finetune-text-classification
description: Fine-tune a HuggingFace Transformers model for text classification using the fake-news detection example.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [huggingface, transformers, finetune, classification]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter1/README.md
imported_at: 2026-04-18T00:00:00Z
---

# Fine-Tune Transformers for Text Classification

## When to use
- Fine-tune a BERT-style model on a custom classification dataset (CSV/JSON).
- Tasks: fake-news detection, sentiment, news categories, vulnerability classification.

## Steps

1. Create environment:

```bash
conda create -n llm python=3.9 && conda activate llm
pip install transformers
pip install -r requirements.txt
conda install pytorch
```

2. Prepare data: CSV with text and target columns.

3. Option A - Decoupled custom version:

```bash
python main.py
```

4. Option B - run_classification.py:

```bash
python run_classification.py \
    --model_name_or_path bert-base-uncased \
    --train_file data/train.csv \
    --validation_file data/val.csv \
    --test_file data/test.csv \
    --metric_name accuracy \
    --text_column_name text \
    --label_column_name target \
    --do_train --do_eval --do_predict \
    --max_seq_length 512 \
    --per_device_train_batch_size 32 \
    --learning_rate 2e-5 \
    --num_train_epochs 1 \
    --output_dir experiments/
```

5. Fix offline metric: pass --metric_name evaluate/metrics/accuracy/accuracy.py

## Pitfalls
- Tsinghua pip mirror installs CPU-only PyTorch; follow with conda install pytorch.
- Script hangs after data load = evaluate package network timeout; use local .py path.

## Source
- Chapter 1 of dive-into-llms - documents/chapter1/README.md
