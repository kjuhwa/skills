---
version: 0.1.0-draft
name: multi-audio-resampling-backends
type: knowledge
category: codecs
summary: Resampling backends: Dasp (pure Rust, slow), Rubato (FFT, faster), SampleRate (libsamplerate, fastest).
confidence: medium
tags: [audio, backends, codecs, multi, resampling]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [Cargo.toml, src/server/audio_service.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Multi Audio Resampling Backends

## Fact
Resampling backends: Dasp (pure Rust, slow), Rubato (FFT, faster), SampleRate (libsamplerate, fastest).

## Why it matters
Choose via feature flag; Rubato is a good default outside of no_std.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `Cargo.toml`
- `src/server/audio_service.rs`
