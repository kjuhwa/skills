---
name: declarative-audio-effects-chain-registry
description: Describe DSP effect chains as JSON with a typed registry so they round-trip through DB, HTTP, and UI without per-effect branching.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [audio, dsp, registry, pedalboard, json-schema]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# Declarative audio effects chain registry

## When to use
You want to let users stack DSP effects (chorus, reverb, compressor, pitch-shift, filters, gain) on generated audio, save those chains to a DB, ship them to a frontend for editing, and apply them on the backend — without a parallel dispatch tree per effect.

## Steps
1. Define one `EFFECT_REGISTRY: dict[str, {cls, label, description, params}]` where each entry maps a JSON-safe type name (`"chorus"`, `"reverb"`) to the DSP library class, a display label, and a `params` sub-dict of `{default, min, max, step, description}` per parameter. This single structure feeds the schema, the UI, and the validator.
2. Represent a chain as a plain list of dicts: `[{"type": "chorus", "enabled": True, "params": {"rate_hz": 1.0, "depth": 0.5, ...}}, ...]`. This is trivially serializable to DB TEXT / JSON / HTTP.
3. Expose `get_available_effects()` that serializes the registry for the frontend (strip the `cls`). The UI auto-builds sliders from the param metadata — new effects light up with zero frontend changes.
4. Write one `validate_effects_chain(chain) -> Optional[str]` that walks the chain and checks type exists, params are the right type, and values are inside their min/max. Reject unknown keys aggressively; silently ignoring a misspelled param is worse than a 400.
5. Provide `build_pedalboard(chain)` that skips entries with `enabled=False`, merges defaults with provided params per entry, and constructs the DSP objects. Apply as `Pedalboard(plugins)(audio_2d, sample_rate)` where `audio_2d` is `(channels, samples)`.
6. Ship a small dict of built-in presets (`robotic`, `radio`, `echo_chamber`, `deep_voice`) as chains of the same shape so users get useful starter points without a special preset type.

## Counter / Caveats
- Never let the HTTP handler branch on effect type — the registry must be the only dispatch point, otherwise new effects require changes in three places.
- Keep the `cls` out of the serialized schema the UI consumes, or you'll leak import-dependent details into the public API.
- For effects whose DSP library expects 2-D `(channels, samples)` input, normalize to 2-D inside the adapter and restore the caller's dimensionality on return.
- If you add an effect with a non-numeric parameter (e.g. a mode enum), extend the validator schema before exposing it to the API, or the existing "must be a number" check will reject valid configs.

Source references: `backend/utils/effects.py` (the `EFFECT_REGISTRY`, presets, validator, and `apply_effects`).
