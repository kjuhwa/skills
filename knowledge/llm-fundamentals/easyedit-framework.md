---
version: 0.1.0-draft
name: easyedit-framework
summary: EasyEdit is a unified Python framework from ZJU-NLP for editing factual knowledge in pretrained LLMs.
category: llm-fundamentals
tags: [easyedit, knowledge-editing, rome, memit, fact-editing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/zjunlp/EasyEdit
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter3/README.md
imported_at: 2026-04-18T00:00:00Z
---

# EasyEdit Framework for LLM Knowledge Editing

## Overview

EasyEdit is a unified Python framework from ZJU-NLP for editing factual knowledge in pretrained LLMs. It provides a standard BaseEditor interface across multiple editing algorithms and models.

## Key Facts

- BaseEditor.from_hparams(hparams): loads the model and algorithm specified by a YAML hparams file.
- editor.edit() accepts: prompts, ground_truth, target_new, subject, optional locality_inputs / portability_inputs.
- Returns: metrics dict (reliability, generality, locality, portability), edited_model, and weights_copy.
- keep_original_weight=True: apply edit on a copy; False: edit in-place (faster, lower memory).
- Supported algorithms: ROME, MEMIT, FT-W, SERAC, GRACE, MEND, KN, and more.
- Supported models: GPT-2-XL, GPT-J, GPT-NeoX, LLaMA, Baichuan, Qwen, Mistral.
- Wikipedia statistics for ROME are precomputed and cached; downloaded on first run.
- Colab demo: https://colab.research.google.com/drive/1KkyWqyV3BjXCWfdrrgbR-QS3AAokVZbr

## Taxonomy

Editing algorithms:
- Locate-and-edit (FFN weight modification): ROME, MEMIT, KN
- Meta-learning: MEND (hypernetwork to predict edits)
- Fine-tuning: FT-W (targeted gradient descent)
- Memory retrieval: SERAC, GRACE (external memory)

## References
- https://github.com/zjunlp/EasyEdit
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter3
