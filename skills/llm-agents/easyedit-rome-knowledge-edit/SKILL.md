---
name: easyedit-rome-knowledge-edit
description: Edit a specific fact in GPT-2-XL using EasyEdit and the ROME method, verified with the Messi football-to-basketball example.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [model-editing, easyedit, rome, knowledge-editing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter3/README.md
imported_at: 2026-04-18T00:00:00Z
---

# EasyEdit + ROME Knowledge Editing

## When to use
- Change a specific factual belief in a pretrained LLM without full retraining.
- Using EasyEdit with ROME or MEMIT algorithm.
- Verify the edit is reliable, general, and does not damage unrelated knowledge.

## Steps

1. Install EasyEdit:

```bash
git clone https://github.com/zjunlp/EasyEdit.git && cd EasyEdit
pip install -r requirements.txt
```

2. Load ROME hyperparameters:

```python
from easyeditor import ROMEHyperParams, BaseEditor
hparams = ROMEHyperParams.from_hparams('./hparams/ROME/gpt2-xl.yaml')
```

3. Prepare edit data:

```python
prompts      = ['Question: What sport does Lionel Messi play? Answer:']
ground_truth = ['football']
target_new   = ['basketball']
subject      = ['Lionel Messi']
```

4. Run the edit:

```python
editor = BaseEditor.from_hparams(hparams)
metrics, edited_model, _ = editor.edit(
    prompts=prompts,
    ground_truth=ground_truth,
    target_new=target_new,
    subject=subject,
    keep_original_weight=False
)
```

5. Verify with generation comparison before and after the edit.

## Pitfalls
- First edit downloads Wikipedia corpus and precomputes per-layer stats (./data/stats); allow extra time.
- For batch-editing multiple facts, use MEMIT.
- Locality inputs must be passed to editor.edit() explicitly to get locality metrics.

## Source
- Chapter 3 of dive-into-llms - documents/chapter3/README.md
