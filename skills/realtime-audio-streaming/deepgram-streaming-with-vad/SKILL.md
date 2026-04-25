---
name: deepgram-streaming-with-vad
description: Stream PCM audio to Deepgram with a server-side Silero VAD gate that skips silence, flushes transcripts on hangover, and remaps DG timestamps to wall-clock time.
category: realtime-audio-streaming
version: 1.0.0
version_origin: extracted
confidence: high
tags: [deepgram, vad, silero, websocket, streaming-stt]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Realtime Deepgram Streaming with VAD Gating

Wrap a Deepgram `LiveConnection` with a per-session VAD gate (Silero ONNX) that (a) skips silence via KeepAlive, (b) flushes transcripts with `finalize()` on speech→silence transitions, and (c) maintains a DG↔wall-clock timestamp mapper so skipped silence doesn't compress segment times.

## When to use

- Realtime STT product that bills per audio-second sent; silence is a large share of the stream.
- You need early-finalized transcripts between phrases without tearing down the socket.
- The wearable/mic source can emit long silence gaps (wearable always-on mic, meeting dead air).

## Core pattern

1. **Gate modes** via env `VAD_GATE_MODE`: `off` | `shadow` (logs decisions, still forwards all) | `active` (skips silence).
2. **State machine** per session: `SILENCE → SPEECH → HANGOVER → SILENCE`.
   - Pre-roll buffer (~300ms) flushed on silence→speech.
   - Hangover window (~4000ms) holds the socket open after speech ends.
   - Mid-hangover `finalize()` fires after `FINALIZE_SILENCE_MS` so UI gets early transcripts.
3. **Socket wrapper** (`GatedDeepgramSocket`) is a drop-in replacement for the raw DG connection — `send()`, `finalize()`, `finish()`, `remap_segments()`. No VAD logic leaks into transcribe handlers.
4. **Timestamp remap**: `DgWallMapper` records `(dg_sec, wall_rel_sec)` checkpoints at each silence→speech transition. Call `remap_segments(segs)` before surfacing transcripts to clients.

## Steps

1. Create `VADStreamingGate(sample_rate, channels, mode, uid, session_id)` per WebSocket connection.
2. Open the Deepgram `LiveConnection` with your language options (Nova-3 multi-lingual / single-language sets).
3. Wrap: `socket = GatedDeepgramSocket(dg_connection, gate)`.
4. For each audio chunk from the client, call `socket.send(pcm_bytes, wall_time=time.time())`.
5. Hook the DG transcript event: call `socket.remap_segments(segments)` to restore wall-clock times.
6. On client disconnect: `socket.finish()` (auto-finalizes if gate active).
7. Log `gate.get_metrics()` / `gate.to_json_log()` to track silence-skipped ratio and byte savings.

## Implementation notes

- Silero VAD runs at 16 kHz mono; resample with linear interpolation if the stream is 8/48 kHz.
- ONNX session is process-global; per-connection recurrent state (h/c) lives on the gate instance.
- Buffer VAD samples across chunks when chunk size < 512 samples (16 ms window).
- Activate `shadow → active` *after* the speaker-profile phase — reset state, reset pre-roll, sync `DgWallMapper._dg_cursor_sec` to current audio cursor, otherwise all post-first-gap timestamps drift.
- If `gate.process_audio` raises, fall back to direct send and disable the gate for that session — do not let VAD errors kill STT.
- KeepAlive is handled by `SafeDeepgramSocket` (separate background thread) — do NOT call `keep_alive()` from the gate.

## Evidence in source

- `backend/utils/stt/vad_gate.py` — VADStreamingGate, GatedDeepgramSocket, DgWallMapper
- `backend/utils/stt/streaming.py` — STTService enum, Deepgram language routing
- `backend/routers/transcribe.py` — WebSocket integration
- `backend/tests/unit/test_streaming_deepgram_backoff.py` — backoff/recovery harness

## Reusability

Applies to any realtime STT pipeline (Deepgram, AssemblyAI Streaming, Rev.ai) where silence-skipping + early-finalize + timestamp fidelity are required simultaneously.
