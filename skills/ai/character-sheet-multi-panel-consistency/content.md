# Character Sheet for Multi-Panel Consistency

## Problem
When generating a sequence of diffusion-model images (comic panels, storyboard frames, RPG portraits across scenes), the character drifts between frames — different hair, outfit, eye color, age. Text prompts alone, without LoRA or ControlNet, give no identity anchor.

You cannot reliably solve this with IP-Adapter or image-to-image at the free tier; but you can dramatically improve consistency with a pure text-prompt trick.

## Pattern

Two-stage LLM flow:

1. **LLM emits a `characterSheet` string** alongside the panel breakdown. The character sheet is a dense, visual, English-language description of the character's fixed attributes (age, ethnicity, hair, eyes, key clothing items, accessories). 15–40 words.

2. **LLM also emits a single `fullPageImagePrompt`** (or per-panel `imagePrompt`) that explicitly instructs the diffuser to "use the SAME character (from characterSheet) in all panels" and repeats the sheet contents in every panel description.

The same text appears in every panel's prompt, so the diffusion model has high-signal overlap across generations — not perfect, but much better than per-panel descriptions that pick different attributes each time.

## Example: schema the LLM returns

```json
{
  "title": "...",
  "characterSheet": "22yo Korean woman poet, long wavy black hair, deep brown eyes, white flowing hanbok-inspired blouse, long navy skirt, holding an old brush pen",
  "panels": [
    { "scene": "...", "dialog": "...", "emotion": "..." }
  ],
  "fullPageImagePrompt": "A single vertical 4-panel comic strip in korean manhwa style, 4 panels stacked vertically separated by thin black borders. Use the SAME character (from characterSheet) in all panels. Panel 1 (top): [visual]. Panel 2: [visual]. Panel 3: [visual]. Panel 4 (bottom): [visual]. Style: cell shading, vibrant colors, clean lineart, anime manhwa, consistent character design"
}
```

## System prompt (LLM) excerpt

```
You are a comic writer. Produce a 4-panel page.

Respond with JSON only:
{
  "title": "...",
  "characterSheet": "Main character description: '<age, ethnicity, hair, eyes, clothing, accessories>'",
  "panels": [ { "scene": "...", "dialog": "...", "emotion": "..." } ],
  "fullPageImagePrompt": "<English prompt that uses the SAME character from characterSheet in every panel, plus style keywords>"
}

Rules:
- characterSheet must be in English (diffusion models handle English best).
- fullPageImagePrompt must be in English and must explicitly mention "SAME character".
- Panels narrate in the user's language; the image prompt does not.
```

## When to use

- Multi-panel comics / webtoons.
- Storyboard generation for a fixed protagonist.
- "Choose your own adventure" image generation where the same character must appear across many scenes.
- Avatar → scene pipelines where you can't use IP-Adapter.

## Pitfalls

- **Language mismatch**: narration may be in Korean / Japanese / etc., but image prompts and the character sheet must be English-heavy — most open diffusion models are trained on English captions.
- **Prompt length limits**: CLIP text encoder truncates at ~75 tokens; long character sheets can push out style keywords. Keep sheets dense and put critical identity tokens first.
- **One tall image vs. N panels**: generating all panels as a *single tall image* with the character sheet repeated gives better consistency than N separate generations — the diffusion pass shares latent features across the whole canvas. Trade-off: you lose per-panel aspect-ratio control.
- **Negative prompt should exclude "extra panels"** when generating a single multi-panel page — otherwise the model may add a 5th or 6th panel.
- **Do not embed dialog in the image prompt** — diffusion models render text as garbled glyphs. Render dialog as a separate overlay (speech bubble drawn at the application layer).
