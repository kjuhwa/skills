---
version: 0.1.0-draft
name: torchaudio-load-needs-torchcodec
summary: torchaudio.load in recent versions routes through torchcodec/ffmpeg, which is not automatically bundled by PyInstaller.
type: knowledge
category: pitfall
confidence: medium
tags: [torchaudio, pyinstaller, ffmpeg, dependencies, freezing]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
linked_skills: [pyinstaller-ml-hidden-imports-playbook, new-ml-backend-dependency-audit]
imported_at: 2026-04-18T00:00:00Z
---

# torchaudio.load needs torchcodec

## Problem
In recent `torchaudio` releases, `torchaudio.load(...)` delegates to the `torchcodec` backend, which in turn shells to `ffmpeg` or a bundled native decoder. PyInstaller's static analysis does not detect this indirection — the frozen binary loads torchaudio fine but blows up at first `.load()` with a `RuntimeError` about missing codecs, or more cryptically `AttributeError: module 'torchcodec' has no attribute '_core'`.

The voicebox backend works around this by using `soundfile` for audio reads where possible, and adding `--hidden-import torchaudio` plus explicit collection of companion codec libraries only when a specific TTS backend requires `torchaudio.load`.

## Why PyInstaller misses it
- `torchaudio` uses dynamic backend dispatch (`torchaudio.set_audio_backend(...)`).
- `torchcodec` ships native `.so`/`.dll` codec loaders that aren't imported by `torchaudio.__init__`.
- The ffmpeg binary itself is a process, not a Python module.

## Mitigations (pick the first that fits)
1. **Avoid it**: use `soundfile` / `librosa` directly (both are simpler to bundle via `--collect-all`) for file reads. Only touch `torchaudio.load` when the model backend hands you a torchcodec-specific path.
2. **Explicit bundling**: add `--collect-all torchaudio`, `--collect-all torchcodec`, and `--collect-all ffmpeg`/`ffmpeg-python` depending on which variant your torchaudio wheel uses. Test with a clean cache.
3. **Monkey-patch**: replace `torchaudio.load` with a `soundfile`-based equivalent at process start if the upstream backend hard-requires `torchaudio.load` for its input path.

## Detection
Grep the library's source for `torchaudio.load` / `torchcodec` before integration. If present, plan for extra bundling effort and a frozen-build test with an unseen audio file.

## Related skills
`pyinstaller-ml-hidden-imports-playbook`, `new-ml-backend-dependency-audit`.

Source references: `backend/build_binary.py` (the `--hidden-import torchaudio` entry), engine-specific backends that route through `soundfile.read` instead of `torchaudio.load`.
