---
name: paren-prefix-voice-description
description: Control voice characteristics via natural language description in parentheses prepended to the TTS input text
category: voice-design
version: 1.0.0
tags: [voice-design, tts, prompt-engineering, control, natural-language]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
  - app.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Voice design via `(description)text` paren-prefix syntax

## When to use
Use this pattern when you want to control voice characteristics (speaking style, emotion, pace, accent) through free-form natural language without modifying the model architecture or tokenizer. The model is trained to interpret parenthesized prefixes as voice instructions, so this works out-of-the-box in design mode without any reference audio.

This is a pure text-preprocessing step — no special tokens, no embeddings, just string formatting.

## Pattern

### Core builder function
```python
def build_final_text(text: str, control: str | None) -> str:
    """
    Prepend a parenthesized voice control description to the TTS text.

    Examples:
      build_final_text("Hello world.", "warm female voice")
        → "(warm female voice)Hello world."
      build_final_text("Hello world.", None)
        → "Hello world."
    """
    if control:
        return f"({control}){text}"
    return text
```

### CLI integration
```python
# In CLI parser (design subcommand)
design_parser.add_argument("--text",    required=True, help="Text to synthesize")
design_parser.add_argument("--control", required=True, help="Voice description in natural language")

def handle_design(args):
    final_text = build_final_text(args.text, args.control)
    audio = model.generate(text=final_text)
    save_audio(audio, args.output)
```

### Mutual exclusivity enforcement
The `--control` flag is exclusive to `design` mode. In `clone` modes, the reference audio provides the voice; a paren prefix would confuse the model:

```python
def validate_design_args(args, parser):
    if args.mode == "clone" and args.control is not None:
        parser.error("--control is only valid in design mode; use --reference-audio for cloning")

def validate_clone_args(args, parser):
    if args.mode == "design" and args.prompt_audio is not None:
        parser.error("--prompt-audio is only valid in clone mode")
```

### Gradio / web app usage
```python
import gradio as gr

def synthesize(text: str, control: str) -> str:
    final_text = build_final_text(text, control.strip() or None)
    audio = model.generate(text=final_text)
    return audio

with gr.Blocks() as demo:
    text_input    = gr.Textbox(label="Text to speak")
    control_input = gr.Textbox(label="Voice description (e.g. 'slow, deep, authoritative')")
    output_audio  = gr.Audio(label="Output")
    btn = gr.Button("Synthesize")
    btn.click(synthesize, inputs=[text_input, control_input], outputs=output_audio)
```

### Example control strings
```python
# Emotion
"(excited, fast-paced)Breaking news: scientists discover life on Mars!"
# Tone
"(calm, reassuring, medical professional)Take two tablets with water every morning."
# Accent + style
"(British English, formal, newsreader)The prime minister announced today..."
# Pace
"(slow, deliberate, elderly)Back in my day, things were very different."
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:71-73` — `build_final_text` implementation
  - `app.py:24-95` — Gradio UI wiring with control input

## Notes
- The parentheses are literal characters — the model tokenizer processes the entire string including `(` and `)`. The model learned this interpretation during training.
- There is no fixed vocabulary of valid control words; the model generalizes from training. Short, comma-separated adjectives tend to work best.
- Do not use this in clone mode — providing both a paren prefix and reference audio is undefined behavior and typically degrades quality.
