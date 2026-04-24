---
name: beg-mid-end-file-sampling-with-padding
description: Sample beginning, middle, and end blocks of a file (with padding token = 256) to feed a fixed-size feature vector to a neural net in constant time.
category: preprocessing
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, preprocessing]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Beg Mid End File Sampling With Padding

**Trigger:** Preprocessing variable-length file content for a small NN that requires fixed-size input and must keep inference latency independent of file size.

## Steps

- Define beg_size (e.g. 1024), mid_size, end_size (1024), block_size (4096), padding_token (256) in the model config.
- Read the beginning block from offset 0, end block from (file_size - block_size), middle block from the file's midpoint.
- If a read would exceed file bounds, truncate and pad the remainder with padding_token.
- Concatenate the blocks (beg + mid + end) into the model's flattened input tensor in deterministic order.
- Encode bytes as int32 (byte value, or padding_token if out of range) so the model can distinguish padding from real bytes.
- Skip the model entirely for files smaller than min_file_size_for_dl (e.g. 8 bytes); fall back to a UTF-8 heuristic.

## Counter / Caveats

- padding_token must be outside the byte range (0-255); 256 is the canonical choice.
- Middle-block reads can land at negative offsets when file_size < mid_size; clamp to [0, file_size).
- All bindings MUST read blocks in the same order (beg, mid, end) — otherwise inference parity breaks silently.
- Files >2GB on 32-bit hosts need 64-bit offsets; test at the 4GB boundary explicitly.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `go/magika/features.go:23-48`
- `rust/lib/src/input.rs:28-42`
- `js/src/model-features.ts:15-62`
- `assets/models/standard_v3_3/config.min.json`
