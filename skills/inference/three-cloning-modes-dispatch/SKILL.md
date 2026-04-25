---
name: three-cloning-modes-dispatch
description: Dispatch across design, controllable cloning, and ultimate cloning modes based on provided argument set
category: inference
version: 1.0.0
tags: [inference, tts, cloning, dispatch, voice]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
  - src/voxcpm/core.py
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Dispatch across design / controllable / ultimate cloning modes

## When to use
Use this pattern when a TTS system supports multiple generation modes (voice design from description, voice cloning with optional control text, ultimate cloning that treats reference audio as a speech prefix) and the dispatch logic must be unambiguous and validated before reaching any model code.

## Pattern

### Mode definitions
| Mode | Inputs required | Generate call |
|---|---|---|
| Design | `--control` text (no audio) | `generate(text=f"({control}){text}")` |
| Controllable cloning | `--reference-audio` + optional `--control` | `generate(text=..., ref_audio=...)` |
| Ultimate cloning | `--reference-audio` + `--prompt-text` (transcript) | `generate_with_prompt_cache(...)` |

### Detection via argument presence
```python
from dataclasses import dataclass
from typing import Optional
import torch

@dataclass
class GenerationRequest:
    text: str
    control: Optional[str] = None          # voice description (design mode)
    reference_audio: Optional[torch.Tensor] = None
    prompt_text: Optional[str] = None      # transcript of reference_audio (ultimate cloning)
    cfg_value: float = 2.0
    num_steps: int = 10

def detect_mode(req: GenerationRequest) -> str:
    has_ref   = req.reference_audio is not None
    has_ctrl  = req.control is not None
    has_trans = req.prompt_text is not None

    if not has_ref and not has_trans:
        return "design"
    if has_ref and not has_trans:
        return "controllable"
    if has_ref and has_trans:
        return "ultimate"
    raise ValueError("prompt_text provided without reference_audio — invalid combination")
```

### Mutual exclusivity validation
```python
def validate_request(req: GenerationRequest, parser=None) -> None:
    """
    Raises or calls parser.error() on invalid combinations.
    """
    def _fail(msg):
        if parser:
            parser.error(msg)
        raise ValueError(msg)

    mode = detect_mode(req)

    if mode == "design" and req.control is None:
        _fail("design mode requires --control (voice description)")
    if mode == "ultimate" and req.control is not None:
        # control text is nulled out for ultimate cloning — reference transcript drives style
        req.control = None
```

### Dispatch to model
```python
def run_generation(model, req: GenerationRequest) -> torch.Tensor:
    validate_request(req)
    mode = detect_mode(req)

    if mode == "design":
        text = f"({req.control}){req.text}"
        return model.generate(text=text, cfg_value=req.cfg_value, num_steps=req.num_steps)

    elif mode == "controllable":
        text = f"({req.control}){req.text}" if req.control else req.text
        return model.generate(
            text=text,
            ref_audio=req.reference_audio,
            cfg_value=req.cfg_value,
            num_steps=req.num_steps,
        )

    elif mode == "ultimate":
        # Ultimate cloning: reference audio is treated as a spoken prefix.
        # Prompt cache allows reusing the KV for many target texts.
        prompt_cache = model.build_prompt_cache(
            prompt_text=req.prompt_text,
            prompt_audio=req.reference_audio,
        )
        return model.generate_with_prompt_cache(
            target_text=req.text,
            prompt_cache=prompt_cache,
            cfg_value=req.cfg_value,
            num_steps=req.num_steps,
        )
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:143-191` — CLI mode detection and validation
  - `src/voxcpm/core.py` — core dispatch between model versions
  - `src/voxcpm/model/voxcpm2.py` — `generate()` and `generate_with_prompt_cache()` implementations

## Notes
- Null out `control` in ultimate cloning mode — the model should not receive a paren prefix when the reference transcript already encodes style.
- If a user provides both `--control` and `--prompt-text`, it's an error. Validate before dispatching.
- `generate_with_prompt_cache` is an optimization for batch generation from the same reference; for a single target, `generate(ref_audio=...)` is simpler.
