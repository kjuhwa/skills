---
version: 0.1.0-draft
name: audio-device-enumeration-platform-divergence
type: knowledge
category: codecs
summary: Audio device enumeration: CPAL (Win/Mac), PulseAudio (Linux non-headless), default fallback.
confidence: medium
tags: [audio, codecs, device, divergence, enumeration, platform]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/server/audio_service.rs
imported_at: 2026-04-19T00:00:00Z
---

# Audio Device Enumeration Platform Divergence

## Fact
Audio device enumeration: CPAL (Win/Mac), PulseAudio (Linux non-headless), default fallback.

## Why it matters
Headless Linux has no PulseAudio; plan a null-sink fallback.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/server/audio_service.rs`
