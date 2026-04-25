---
name: gpt2-text-steganography-huffman-flc
description: Embed secret bits into GPT-2 generated text using Huffman or Fixed-Length Coding steganography.
category: security
version: 1.0.0
version_origin: extracted
tags: [steganography, gpt-2, huffman, flc]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter7/README.md
imported_at: 2026-04-18T00:00:00Z
---

# GPT-2 Text Steganography via Huffman / FLC

## When to use
- Hide secret information in LLM-generated text that is indistinguishable to humans.
- Experimenting with Huffman Coding or Fixed-Length Coding (FLC) steganography.
- Compare stega-text vs normal GPT-2 output.

## Steps

1. Install dependencies:

```bash
pip install torch transformers jupyter
```

2. Open the notebook:

```bash
jupyter notebook llm_stega.ipynb
```

3. Initialize handler:

```python
k = 2
handle = Huffman(k=2**k, bits=bits)
# Or: handle = FLC(k=k, bits=bits)
```

4. Generate stega and normal text:

```python
stega_output, normal_output = generate_text_with_steganography(
    model, tokenizer, "Hello, I'm", handle
)
# Saves: outputs-gpt2-stega.txt and outputs-gpt2-normal.txt
```

5. Decoding: use same model, tokenizer, and handler to extract hidden bits.

## Pitfalls
- GPT-2 auto-downloads on first run (~500MB); use hf-mirror.com in China.
- Longer secrets produce longer generated texts.

## Source
- Chapter 7 of dive-into-llms - documents/chapter7/README.md
