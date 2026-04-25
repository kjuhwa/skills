---
version: 0.1.0-draft
name: paren-natural-language-voice-control
summary: VoxCPM2 interprets parenthesized natural-language prefixes as voice control instructions with no special tokens required
category: voice-design
tags: [voice-design, tts, control, natural-language, prompt]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
  - app.py
  - README.md
imported_at: 2026-04-18T00:00:00Z
---

# Voice description in parentheses as natural-language control

VoxCPM2 supports free-form voice control through a simple text convention: prepend a parenthesized description of the desired voice to the text you want synthesized. For example, `(warm, calm, female)Hello and welcome.` instructs the model to speak the sentence in a warm, calm, female voice. This convention requires no special tokens, no vocabulary expansion, and no architectural changes — it is a learned behavior baked in during training on data where parenthesized prefixes co-occur with specific voice characteristics.

The parentheses are literal ASCII characters (`(` and `)`). The model's tokenizer processes them as ordinary punctuation, and the language model has learned to condition its subsequent audio generation on the content of the parenthesized span. This means the control vocabulary is effectively open-ended — the model generalizes from training rather than being limited to a fixed set of voice attributes.

In practice, short comma-separated adjectives describing speaking style, emotion, pace, gender, and accent work best. Very long or contradictory descriptions (e.g., "(slow and very fast, high pitched and deep)") produce unpredictable results. The parenthesis feature is exclusive to design mode; in clone mode the reference audio provides voice characteristics and the paren prefix should be omitted.

## Why it matters
This is a deliberately simple convention that avoids the complexity of embedding-based style control (e.g., style tokens, GST). When integrating VoxCPM2 into a product, exposing a free-text "voice description" field to users directly translates to this format without any intermediate processing.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:71-73` — `build_final_text()` showing the exact string format
  - `app.py` — Gradio UI exposing the control field
  - `README.md` — examples of voice description strings and their effects
