---
version: 0.1.0-draft
name: llm-text-steganography
summary: LLM text steganography hides secret binary information in the token-by-token generation process.
category: security
tags: [steganography, huffman, flc, gpt-2, information-hiding]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter7/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Text Steganography

## Overview

LLM text steganography hides secret binary information in the token-by-token generation process. At each step the model selects a token from a vocabulary partition that encodes the next bits of the secret.

## Key Facts

- Huffman Coding: vocabulary tokens grouped into a Huffman tree; next bits select a leaf. Higher-probability groups get shorter codewords.
- Fixed-Length Coding (FLC): vocabulary partitioned into 2^k equal-size groups; k bits select a group, then a token is sampled proportionally.
- Both methods are exactly reversible: given the same model and prompt, receiver can extract hidden bits.
- Generated stega-text looks like normal model output; undetectable to humans.
- Encoding: secret bits -> constrained token selection during generation.
- Decoding: given text + same model, recompute token group selections -> recover bits.

## Taxonomy

Methods by grouping strategy:
- Huffman: variable-length codes, entropy-optimal, groups change per step
- FLC: fixed k bits per token, simpler, slightly less efficient

## References
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter7
