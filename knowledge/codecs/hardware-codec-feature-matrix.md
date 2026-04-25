---
version: 0.1.0-draft
name: hardware-codec-feature-matrix
type: knowledge
category: codecs
summary: hwcodec backend coverage: Intel QSV (Windows/Linux), NVIDIA NVENC (all platforms), AMD AVC/HEVC (Windows), Android MediaCodec.
confidence: high
tags: [codec, codecs, feature, hardware, matrix]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/common/hwcodec.rs
imported_at: 2026-04-19T00:00:00Z
---

# Hardware Codec Feature Matrix

## Fact
hwcodec backend coverage: Intel QSV (Windows/Linux), NVIDIA NVENC (all platforms), AMD AVC/HEVC (Windows), Android MediaCodec.

## Why it matters
Design a runtime probe + feature-flag matrix; never assume NVENC on Linux containers.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `libs/scrap/src/common/hwcodec.rs`
