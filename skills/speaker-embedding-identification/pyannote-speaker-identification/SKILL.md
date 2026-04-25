---
name: pyannote-speaker-identification
description: Extract speaker embeddings with pyannote (v1 + v2 wespeaker) on GPU, enforce a minimum audio duration to avoid fbank crashes, and compare embeddings against a threshold.
category: speaker-embedding-identification
version: 1.0.0
version_origin: extracted
confidence: high
tags: [pyannote, speaker-diarization, speaker-id, embeddings, torch, fastapi]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Pyannote Speaker Embedding Extraction with Validation

A production-ready recipe for speaker identification: pyannote embedding model loaded once on GPU, audio duration validated before inference (avoids silent `wespeaker` crashes on < 0.5 s clips), and dual v1/v2 endpoints so you can roll out a new embedding model without breaking existing clients.

## When to use

- Multi-speaker conversation product where you need to tag "Speaker N" with a known person after a short enrollment clip.
- You have a FastAPI service that receives short audio uploads for speaker matching.
- You want to upgrade from `pyannote/embedding` to `pyannote/wespeaker-voxceleb-resnet34-LM` without a breaking change.

## Core pattern

```
UploadFile  ─►  save chunked to _temp/<uuid>_<name>
            ─►  _validate_audio_duration  (≥ MIN_EMBEDDING_AUDIO_DURATION seconds)
            ─►  Inference(model, window="whole")(path)  on CUDA
            ─►  embedding.tolist()   → JSON
            ─►  finally: os.remove(temp)
```

## Steps

1. **Lazy device select**: `device = torch.device("cuda" if torch.cuda.is_available() else "cpu")`. Fail-open to CPU for dev.
2. **Load once** at module import:
   ```python
   m = Model.from_pretrained("pyannote/embedding", token=os.getenv('HUGGINGFACE_TOKEN'))
   inf = Inference(m, window="whole"); inf.to(device)
   ```
   Repeat for v2 (`wespeaker-voxceleb-resnet34-LM`).
3. **Duration guard**: read header via `wave.open()` first (fast, no decode); fall back to `torchaudio.info()` for mp3/flac/ogg. Raise HTTP 422 with `{error: audio_too_short, min_duration, actual_duration}` if below `MIN_EMBEDDING_AUDIO_DURATION` (default 0.5 s).
4. **Write upload** with `shutil.copyfileobj(file.file, f)` — chunked, bounded memory. Sanitize filename with `os.path.basename()` to block path traversal.
5. **Run inference** on the temp path. Return `embedding.tolist()` (numpy → JSON-serializable list).
6. **Always** clean up the temp file in `finally:`, even on validation error.
7. **Compare embeddings** elsewhere: cosine similarity with a configurable `SPEAKER_MATCH_THRESHOLD`. Log matches with user-id for audit.

## Implementation notes

- `wespeaker` fbank crashes hard on very short clips (issue #4572 in source repo). The duration guard is what keeps the service from 500'ing.
- Loading both models at boot doubles VRAM — if GPU-tight, lazy-load v2 on first v2 request.
- Window mode `"whole"` gives one embedding per clip; use `"sliding"` when you need frame-level embeddings for diarization.
- Save HF token as secret; pyannote models are gated.
- The `/tmp`-style dir (`_temp/`) is fine for single-instance; switch to per-request temp dir (`tempfile.TemporaryDirectory()`) for multi-worker uvicorn.

## Evidence in source

- `backend/diarizer/embedding.py` — model load, duration guard, v1 + v2 endpoints
- `backend/utils/stt/speaker_embedding.py` — `compare_embeddings`, `SPEAKER_MATCH_THRESHOLD`
- `backend/routers/sync.py` — integration with offline sync pipeline

## Reusability

Applies to any multi-speaker conversation app (meeting tools, call-center analytics, journaling wearables) where "who is this?" must be answered from short audio. The duration guard + dual-version loader pattern is transferable to any HuggingFace audio model.
