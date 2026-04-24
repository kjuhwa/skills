---
name: huggingface-snapshot-selective-patterns
description: Download only the files you need from a HuggingFace repo using snapshot_download with allow_patterns — avoids pulling tokenizer, chat-template, or README blobs you don't use.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [huggingface, snapshot-download, bandwidth, model-loading]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model_mlx.py
imported_at: 2026-04-18T00:00:00Z
---

# Selective HF Snapshot Download

## When to use
- You load a draft / adapter / quantized checkpoint that only needs weights + config; the repo also contains gigabytes of tokenizer, preview images, or sharded backups you don't want.
- You want to short-circuit the "HF cache blew up my disk" problem on CI or small dev machines.

## Pattern

```python
from huggingface_hub import snapshot_download

path = Path(snapshot_download(
    draft_id,
    allow_patterns=["*.safetensors", "*.json"],
))
cfg = json.loads((path / "config.json").read_text())
weights = {
    k: v
    for f in path.glob("*.safetensors")
    for k, v in mx.load(str(f)).items()
}
```

## Other useful patterns

| Use case | `allow_patterns` |
|---|---|
| Weights + config only | `["*.safetensors", "*.json"]` |
| Plus tokenizer | `["*.safetensors", "*.json", "tokenizer*"]` |
| Everything except README / images | use `ignore_patterns=["*.md", "*.png", "*.jpg"]` instead |
| Pytorch bin shards | `["*.bin", "*.json"]` |

## Gotchas
- `allow_patterns` is *glob*, not regex — `*.safetensors` matches `model.safetensors` but also `model-00001-of-00002.safetensors` (which you want).
- If the repo ships `model.safetensors.index.json` you must include it (`*.json` does) or `from_pretrained` can't locate shards.
- `snapshot_download` returns a cache path inside `~/.cache/huggingface/hub/...` — treat it read-only.
- For private repos, pass `token=hf_token` or rely on `HF_TOKEN` env var; snapshot_download propagates both.
