---
name: inline-i18n-dictionary-with-dropdown
description: Inline i18n via Python dict keyed by language code, swapped live via Gradio dropdown callback
category: gradio
version: 1.0.0
tags: [gradio, i18n, localization, python, ui]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - app.py
  - lora_ft_webui.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Inline i18n via Python dict keyed by language code, swapped via Gradio dropdown callback

## When to use
Use this pattern for small-to-medium Gradio apps that need multilingual labels (e.g., English + Chinese) without pulling in a gettext/i18next setup. The entire translation table lives inline in the Python file — no external JSON files, no build step, no file I/O at runtime.

Appropriate when: you have ≤ 5 languages, ≤ 50 translatable strings, and want the simplest possible implementation.

## Pattern

### Define the translation dictionary
```python
_I18N = {
    "en": {
        "title":           "VoxCPM Voice Synthesis",
        "text_label":      "Text to speak",
        "control_label":   "Voice description",
        "output_label":    "Generated audio",
        "run_button":      "Synthesize",
        "lang_label":      "Language",
        "cfg_label":       "CFG scale",
        "steps_label":     "Inference steps",
        "ref_audio_label": "Reference audio",
    },
    "zh-CN": {
        "title":           "VoxCPM 语音合成",
        "text_label":      "待合成文本",
        "control_label":   "声音描述",
        "output_label":    "生成音频",
        "run_button":      "合成",
        "lang_label":      "语言",
        "cfg_label":       "CFG 强度",
        "steps_label":     "推理步数",
        "ref_audio_label": "参考音频",
    },
}

SUPPORTED_LANGS = list(_I18N.keys())

def t(key: str, lang: str = "en") -> str:
    """Translate a key into the given language, falling back to English."""
    return _I18N.get(lang, _I18N["en"]).get(key, _I18N["en"].get(key, key))
```

### Build the UI with language dropdown
```python
import gradio as gr

def build_ui():
    default_lang = "en"

    with gr.Blocks() as demo:
        # Language selector at the top
        lang_dropdown = gr.Dropdown(
            choices=SUPPORTED_LANGS,
            value=default_lang,
            label=t("lang_label", default_lang),
            interactive=True,
        )

        gr.Markdown(f"# {t('title', default_lang)}", elem_id="title")

        text_input  = gr.Textbox(label=t("text_label",    default_lang))
        ctrl_input  = gr.Textbox(label=t("control_label", default_lang))
        cfg_slider  = gr.Slider(minimum=1.0, maximum=5.0, value=2.0,
                                label=t("cfg_label", default_lang))
        run_btn     = gr.Button(t("run_button", default_lang))
        audio_out   = gr.Audio(label=t("output_label", default_lang))
```

### Language change callback
```python
        def on_lang_change(lang: str):
            """Return gr.update() calls to relabel all components."""
            return (
                gr.update(label=t("text_label",    lang)),
                gr.update(label=t("control_label", lang)),
                gr.update(label=t("cfg_label",     lang)),
                gr.update(value=t("run_button",    lang)),
                gr.update(label=t("output_label",  lang)),
            )

        lang_dropdown.change(
            fn=on_lang_change,
            inputs=[lang_dropdown],
            outputs=[text_input, ctrl_input, cfg_slider, run_btn, audio_out],
        )

        # Synthesis callback
        run_btn.click(fn=synthesize, inputs=[text_input, ctrl_input, cfg_slider], outputs=audio_out)

    return demo
```

### For fine-tuning UI (lora_ft_webui.py pattern)
The same pattern scales to more complex UIs — just add more keys to `_I18N` and more `gr.update()` returns in `on_lang_change`.

```python
# Example with nested component groups
def on_lang_change(lang):
    updates = {k: gr.update(label=t(k, lang)) for k in _I18N["en"].keys()}
    return list(updates.values())
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `app.py:96-120` — main inference UI with `_I18N_TRANSLATIONS` dict and `on_lang_change` callback
  - `lora_ft_webui.py:28-91` — fine-tuning UI using the same pattern with more components

## Notes
- The `gr.update()` count in `on_lang_change` outputs must exactly match the `outputs=` list in `.change()`; a mismatch causes a silent runtime error in Gradio.
- Markdown components cannot be relabeled via `gr.update(label=...)` — use `gr.update(value=...)` for them.
- This pattern does not persist the user's language choice across page reloads; add a `gr.State` component and `gr.load` event if persistence is needed.
