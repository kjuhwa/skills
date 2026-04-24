---
name: opus-encoding-on-mcu
description: Configure the embedded Opus 1.2.1 encoder on a Zephyr RTOS MCU with a ring-buffer feed, CELT/Hybrid modes, and a callback-based output for BLE transmission.
category: opus-codec-firmware
version: 1.0.0
version_origin: extracted
confidence: high
tags: [opus, zephyr, firmware, ble, wearable, mcu, ring-buffer]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# Opus Encoder on Embedded MCU (Zephyr RTOS)

Portable MCU-side pattern: raw PCM from the mic driver drops into a ring buffer; a dedicated codec thread pulls one frame, encodes with Opus 1.2.1, and emits the compressed bytes to a registered callback (typically the BLE notify path). Reduces BLE bandwidth by ~80% vs raw PCM — essential for battery-limited wearables.

## When to use

- Zephyr/NRF/ESP32 wearable captures 16-bit 16 kHz mono audio and must ship it over BLE 5.x.
- Low-latency pipeline with no filesystem (no local WAV write).
- You want a CMake-toggleable `CODEC_OPUS` vs `CODEC_RAW` for debugging.

## Core pattern

```
mic_driver  ─►  codec_receive_pcm()  ─►  ring_buf_put
                                           │
                                           ▼
                              [codec thread loop]
                                   ├─ wait until ≥ CODEC_PACKAGE_SAMPLES * 2 bytes
                                   ├─ ring_buf_get → codec_input_samples
                                   ├─ execute_codec() → codec_output_bytes
                                   └─ _callback(codec_output_bytes, output_size)
```

## Steps

1. **Static-allocate** the encoder: `OpusEncoder *state = (OpusEncoder *) m_opus_encoder;` — size depends on mode (CELT = 7180, Hybrid = 10916). Verify with `opus_encoder_get_size(1) == sizeof(m_opus_encoder)`.
2. **Init** in `codec_start()`:
   ```c
   opus_encoder_init(state, 16000, 1, CODEC_OPUS_APPLICATION);
   opus_encoder_ctl(state, OPUS_SET_BITRATE(CODEC_OPUS_BITRATE));
   opus_encoder_ctl(state, OPUS_SET_VBR(CODEC_OPUS_VBR));
   opus_encoder_ctl(state, OPUS_SET_VBR_CONSTRAINT(0));
   opus_encoder_ctl(state, OPUS_SET_COMPLEXITY(CODEC_OPUS_COMPLEXITY));
   opus_encoder_ctl(state, OPUS_SET_SIGNAL(OPUS_SIGNAL_VOICE));
   opus_encoder_ctl(state, OPUS_SET_LSB_DEPTH(16));
   opus_encoder_ctl(state, OPUS_SET_DTX(0));
   opus_encoder_ctl(state, OPUS_SET_INBAND_FEC(0));
   opus_encoder_ctl(state, OPUS_SET_PACKET_LOSS_PERC(0));
   ```
3. **Ring buffer** sized to `AUDIO_BUFFER_SAMPLES * 2` bytes (int16). Set via `ring_buf_init(&codec_ring_buf, sizeof(buf), buf)`.
4. **Thread** with dedicated 32 KB stack at `K_PRIO_PREEMPT(4)`. Loop: check size → `ring_buf_get` → `execute_codec()` → `_callback(bytes, size)` → `k_yield()`.
5. **Register callback** from BLE layer: `set_codec_callback(ble_notify_audio_bytes);`.
6. Wrap all the Opus includes in `#ifdef CODEC_OPUS` so builds can swap to raw for bring-up.

## Implementation notes

- Use `OPUS_SIGNAL_VOICE` + `COMPLEXITY ≈ 5` as a start — complexity ≥ 8 on Cortex-M4 runs the codec thread beyond real-time at 16 kHz.
- Turn DTX / FEC OFF on the MCU; upstream VAD gating (see `deepgram-streaming-with-vad`) handles silence much better than DTX.
- `codec_receive_pcm` returns `-1` on buffer-full — log and drop; never block the mic ISR.
- If `OPUS_PACKAGE_SAMPLES = 320` (20 ms @ 16 kHz), per-frame output is ~40 bytes at 16 kbps. Fits neatly in a single BLE 2M notify.

## Evidence in source

- `omi/firmware/devkit/src/codec.c` — thread, ring buffer, Opus init block
- `omi/firmware/devkit/src/codec.h` — public API (`codec_start`, `set_codec_callback`, `codec_receive_pcm`)
- `omi/firmware/devkit/src/lib/opus-1.2.1/` — vendored encoder

## Reusability

Pattern holds for any MCU RTOS with ring buffers + threading primitives (FreeRTOS `xStreamBuffer`, NuttX pipes). Swap `k_thread_create` for platform equivalent; keep the ring-buffer / callback split intact.
