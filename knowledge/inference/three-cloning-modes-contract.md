---
version: 0.1.0-draft
name: three-cloning-modes-contract
summary: VoxCPM2 has three distinct generation modes (design, controllable cloning, ultimate cloning) with mutually exclusive input contracts
category: inference
tags: [inference, cloning, modes, tts, api]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
  - app.py
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
---

# Controllable vs ultimate cloning vs prompt-cache mode

VoxCPM2 exposes three generation modes, each with a distinct input contract and internal execution path:

**Design mode**: Takes `text` + `control` (natural language voice description). No reference audio required. The model generates speech in the described voice style by interpreting the parenthesized prefix. Call: `model.generate(text=f"({control}){text}")`.

**Controllable cloning**: Takes `text` + `reference_audio`. Optionally also accepts `control` text. The model clones the voice in the reference audio while speaking the target text. The optional `control` allows style adjustments on top of the cloned voice. Call: `model.generate(text=..., ref_audio=...)`.

**Ultimate cloning**: Takes `text` + `reference_audio` + `prompt_text` (transcript of the reference audio). The model treats the reference as a spoken prefix — as if the reference speaker said `prompt_text` and the model continues with `text`. This produces the most natural continuation but requires knowing the transcript. Internally this uses `generate_with_prompt_cache()` to pre-encode the reference once and reuse it. The `control` parameter must be `None` in this mode.

The three modes are mutually exclusive — providing wrong combinations (e.g., `control` + `prompt_text`) raises a validation error before any model code runs.

## Why it matters
Choosing the wrong mode for a use case degrades quality significantly. Ultimate cloning produces the most natural-sounding output but requires a transcript; if the transcript is inaccurate, the model produces hallucinated continuations. Design mode works without any reference audio, making it suitable for zero-shot voice creation.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:121-148` — mode detection and mutual exclusivity validation
  - `app.py` — Gradio UI showing the three mode tabs
  - `src/voxcpm/model/voxcpm2.py` — `generate()` and `generate_with_prompt_cache()` entry points
