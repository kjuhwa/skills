---
name: chunked-tts-with-crossfade
description: Generate long TTS outputs by sentence-splitting the input, generating each chunk independently, and concatenating with a short crossfade.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [tts, audio, chunking, crossfade, long-form]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# Chunked TTS with crossfade

## When to use
You need to synthesize text longer than a single-shot TTS backend can reliably handle (Chatterbox, Qwen TTS, and others degrade or hallucinate past ~800 characters). You want an engine-agnostic wrapper that splits, generates, and stitches audio back together with no user-visible seams.

## Steps
1. Fast-path short text: if `len(text) <= max_chars` (default 800), call `backend.generate()` once and return. Keep overhead at zero for the common case.
2. Split at natural boundaries. Priority order:
   - Last sentence end (`.`, `!`, `?`, plus CJK `。！？`) that is NOT preceded by a common abbreviation (`Mr`, `Dr`, `e.g`, `u.s`, etc.) and NOT immediately after a digit (decimal number).
   - Last clause boundary (`;`, `:`, `,`, em-dash) if no sentence end is found.
   - Last whitespace as a fallback.
   - Hard cut only as the absolute fallback.
3. Respect atomic tokens. If the backend supports paralinguistic tags like `[laugh]`, `[sigh]`, detect them with a bracket regex and never cut inside them; walk the hard-cut position back to just before the tag start if necessary.
4. Generate each chunk independently. Vary the per-chunk seed deterministically (`chunk_seed = seed + i`) so the same `(text, seed)` pair always produces the same output while still breaking RNG-correlated artefacts between chunks.
5. Apply an optional per-chunk trim function (silence / hallucination trim) before concatenation, so chunk boundaries align with speech not silence.
6. Concatenate with a linear crossfade (default 50 ms). Compute overlap as `min(crossfade_samples, len(result), len(chunk))`; apply `fade_out * result[-overlap:] + fade_in * chunk[:overlap]` and then append the chunk tail. Support `crossfade_ms=0` for a hard cut when testing.

## Counter / Caveats
- A naive character-count split creates audible pops at sentence boundaries; the crossfade plus the trim step is what makes chunked output sound continuous.
- The abbreviation list is locale-specific. Extend it for your text domain (legal, medical, technical) or you'll see sentences broken after `Ltd.` / `Fig.` etc.
- Do not vary pitch/voice-prompt per chunk — only the seed. Changing the voice conditioning between chunks makes the result sound like two speakers.
- Prefer a 50 ms crossfade. Longer crossfades start to bleed phonemes across the boundary, shorter ones leave clicks.

Source references: `backend/utils/chunked_tts.py`, `backend/services/generation.py`.
