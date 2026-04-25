---
version: 0.1.0-draft
name: gated-huggingface-hardcoded-config
summary: Some ML libraries hardcode the original HF repo id for config lookup; the app breaks when only a community fork (MLX / quantized) is cached.
type: knowledge
category: pitfall
confidence: medium
tags: [huggingface, caching, mlx, transformers, offline]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
linked_skills: [force-hf-offline-when-cached]
imported_at: 2026-04-18T00:00:00Z
---

# Gated HuggingFace hardcoded-config pitfall

## Problem
A model backend (typically an MLX or quantized port) ships weights in a forked HF repo (`mlx-community/Foo-bf16`, `TheBloke/Foo-GGUF`) but some part of the loader still calls `AutoConfig.from_pretrained("original-org/Foo")` or `AutoTokenizer.from_pretrained("original-org/Foo")`. When the app is offline — or when the user only downloaded the forked repo — the config fetch fails with `LocalEntryNotFoundError` / network error even though the actual weights are on disk.

The specific case in voicebox: `mlx_audio` tries to fetch config from `Qwen/Qwen3-TTS-12Hz-1.7B-Base` when only `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16` is cached.

## Workaround
Symlink the expected original-repo cache path to the actual cached fork:

```python
from huggingface_hub import constants as hf_constants
from pathlib import Path

cache_dir = Path(hf_constants.HF_HUB_CACHE)
original = cache_dir / "models--original-org--Foo"
fork = cache_dir / "models--mlx-community--Foo-bf16"

if not original.exists() and fork.exists():
    original.symlink_to(fork, target_is_directory=True)
```

Creates the illusion that the original repo is cached, so the config lookup succeeds without network.

## Caveats
- Works only when the forked repo is a true drop-in (same `config.json`, same tokenizer files). Verify manually before wiring it up.
- Windows requires admin or developer-mode for `symlink_to`. If you support Windows, fall back to copying the relevant files.
- This is a band-aid. Upstream the fix in the loader (accept a `base_repo_id` parameter) if you own the library.

## Related skills
`force-hf-offline-when-cached` wraps the load call in a `HF_HUB_OFFLINE=1` context and performs this symlink at startup to make the whole setup deterministic.

Source references: `backend/utils/hf_offline_patch.py` (`ensure_original_qwen_config_cached`).
