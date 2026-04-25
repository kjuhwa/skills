---
version: 0.1.0-draft
name: vad-silence-trim-optional
summary: VoxCPM optionally trims leading/trailing silence from reference audio using librosa frame-wise RMS below a top_db threshold
category: audio
tags: [audio, vad, silence, preprocessing, reference-audio]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/model/voxcpm2.py
imported_at: 2026-04-18T00:00:00Z
---

# Optional VAD silence trimming via librosa top_db

VoxCPM2 includes an optional preprocessing step that trims leading and trailing silence from reference audio before encoding. The trimming is implemented with librosa's frame-wise RMS energy: frames whose energy is below `top_db` decibels relative to the peak are removed from both ends of the waveform. A typical value is `top_db=35`.

This feature is off by default. Enabling it can improve voice cloning quality when the reference audio has significant silence at the start or end (e.g., a recording with pre-roll silence), since the LocEnc encoder would otherwise waste capacity encoding silence frames that contribute little to the voice representation.

The risk is that the trimmer may clip intentional pauses or breaths at the boundaries of the reference audio, particularly for slow or breathy speaking styles. Low `top_db` values (e.g., 20) are more aggressive and may trim meaningful audio; high values (e.g., 50) are permissive and may leave silence in.

## Why it matters
If users report that VoxCPM produces a "slightly different" voice than expected from their reference, leading/trailing silence in the reference is a common cause. Enabling VAD trim with `top_db=35` often fixes this. Conversely, if the reference recording captures a deliberate breath before speech starts, disabling the trim preserves that stylistic element.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/model/voxcpm2.py:52-88` — VAD trim implementation using librosa RMS and `top_db` parameter
