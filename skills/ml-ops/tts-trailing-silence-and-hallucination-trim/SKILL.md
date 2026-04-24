---
name: tts-trailing-silence-and-hallucination-trim
description: Post-process TTS output to cut long internal silences plus any trailing hallucinated noise with a cosine fade-out.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [tts, audio, silence-detection, post-processing, quality]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# TTS trailing silence and hallucination trim

## When to use
Your TTS engine (Chatterbox, Chatterbox Turbo, some variants of XTTS) occasionally produces `[speech][silence][hallucinated noise]`: a long pause followed by unrelated mumbling, breathing, or music. You want a deterministic, no-ML cleanup pass that cuts the output at the natural speech boundary and fades out cleanly.

## Steps
1. Compute per-frame RMS energy over a short window (e.g. `frame_ms=20`, so `frame_len = sample_rate * frame_ms / 1000`). Convert a `silence_threshold_db` (e.g. -40 dB) to linear amplitude and classify each frame as speech or silence.
2. Find the first speech frame and step back by one frame for padding — that becomes the new start sample. This handles small leading silences without cutting the first phoneme.
3. Walk forward from the first speech frame, counting consecutive silence frames. The first time `consecutive_silence >= max_internal_silence_frames` (e.g. 1000 ms), set the cut point at the start of that long silence and stop. This is the key insight: hallucinations are gated by a long gap.
4. From the cut point, trim back any trailing silence until you find a speech frame, then add a short tail (e.g. 200 ms of `min_silence_ms`) so the ending doesn't sound truncated.
5. Apply a short cosine fade-out (`~30 ms`) on the last N samples: `fade = cos(linspace(0, pi/2, N)) ** 2` multiplied into the tail. The cosine-squared curve is inaudible; a linear fade clicks.
6. Expose the trim as a pure function `(audio, sample_rate) -> audio` so it can be plugged into a chunked-TTS wrapper or applied to a whole generation.

## Counter / Caveats
- Only enable this for engines that actually hallucinate (flag them with a `needs_trim=True` in your model registry). Clean engines will lose legitimate dramatic pauses.
- The threshold-based detector cannot tell "hallucinated noise" from "real faint speech". A human with a whisper/breath pattern may get cut. If users report truncation, relax `silence_threshold_db` first, then `max_internal_silence_ms`.
- Use `np.sqrt(mean(audio**2))` per frame, not instantaneous peak — peaks over-react to transients.
- Keep the fade-out short (~30 ms). Longer fades chew into the final syllable.

Source references: `backend/utils/audio.py` (`trim_tts_output`), `backend/utils/chunked_tts.py` (uses `trim_fn` per chunk).
