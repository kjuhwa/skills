---
name: gradio-spaces-demo-deploy
description: Deploy a fine-tuned Transformers model as a Gradio web interface and push it to HuggingFace Spaces.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [gradio, huggingface-spaces, demo]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter1/README.md
imported_at: 2026-04-18T00:00:00Z
---

# Deploy a Fine-Tuned Model as a Gradio Spaces Demo

## When to use
- You have a fine-tuned model and want a shareable web demo without a dedicated server.
- Host for free on HuggingFace Spaces using the Gradio SDK.

## Steps

1. Create a new Gradio Space at https://huggingface.co/new-space?sdk=gradio

2. Write app.py:

```python
import gradio as gr
from transformers import pipeline

classifier = pipeline("text-classification", model="./model")

def predict(text):
    result = classifier(text)[0]
    return result["label"], result["score"]

demo = gr.Interface(fn=predict, inputs="text", outputs=["label", "number"])
demo.launch()
```

3. Create requirements.txt with pinned transformers and torch versions.

4. Upload app.py, requirements.txt, and model files to your Space.

5. The Space builds and launches automatically.

## Example

Reference demo: https://huggingface.co/spaces/cooelf/text-classification

## Pitfalls
- HuggingFace Spaces may require a VPN in China.
- Large model files may exceed free-tier storage; load model by Hub ID instead.

## Source
- Chapter 1 of dive-into-llms - documents/chapter1/README.md
