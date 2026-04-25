---
name: flash-attn-optional-import-fallback
description: Try-import flash_attn and choose HuggingFace attn_implementation accordingly, falling back to torch sdpa with a loud warning that points the user to the fix.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [transformers, attention, flash-attention, optional-dependency, fallback]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# Flash-Attn Optional Import → attn_implementation

## When to use
- You load a HuggingFace model that benefits from `attn_implementation="flash_attention_2"` but want the script to run on machines without flash-attn installed (CPU, older GPUs, Apple Silicon, CI).
- You want the user to know *why* their benchmark is slow, with a copy-pasteable install command.

## Pattern

```python
def _get_transformers_attn_impl() -> str:
    try:
        import flash_attn  # noqa: F401
        return "flash_attention_2"
    except ImportError:
        logger.warning(
            "flash_attn not installed. Falling back to torch.sdpa. Speedup will be lower. "
            "For optimal speedup in Transformers backend, please install: "
            "pip install flash-attn --no-build-isolation"
        )
        return "sdpa"


attn_impl = _get_transformers_attn_impl()
model = AutoModelForCausalLM.from_pretrained(
    name, attn_implementation=attn_impl, dtype=torch.bfloat16,
).to(device).eval()
```

## Why this shape
- A single import check at startup; the `noqa: F401` prevents lint noise for the "unused" module (the import *is* the check).
- Warn, don't crash — benchmarking a fallback implementation is still useful for correctness, just slower.
- The warning includes the exact install hint so the user never has to search for "how do I install flash-attn on HF transformers".

## Gotchas
- `flash_attention_2` requires Ampere or newer + `dtype=torch.bfloat16` / `torch.float16`. If you run FP32 you'll get a clearer error than a silent slowdown.
- Some HF model classes don't accept `attn_implementation="flash_attention_2"` even when flash-attn is importable (older configs). Catch the `ValueError` at `from_pretrained` time and degrade to `sdpa` there too.
- `--no-build-isolation` in the install hint is deliberate — flash-attn needs a compatible torch in the build env, which isolation breaks.
