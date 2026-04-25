---
name: platform-agnostic-file-input-abstraction
description: Trait-based input abstraction (SyncInput / AsyncInput) so a single inference codebase accepts file paths, byte slices, BytesIO, and tokio::File without conditional compilation.
category: inference
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, inference]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Platform Agnostic File Input Abstraction

**Trigger:** An inference engine must serve multiple input sources (file, bytes, stream) without duplicating logic per source type.

## Steps

- Define a trait with two methods: length() -> u64 and read_at(buf, offset) -> Result.
- Implement for File (seek+read), &[u8] (slice copy), and BytesIO/BinaryIO (seek+read).
- For async, wrap sync impls via ready() futures; provide native impls for tokio::File when needed.
- Inference functions accept generic <T: Input>; no runtime branching on input type.
- Expose ergonomic public API: identify_file(path), identify_bytes(bytes), identify_stream(stream).
- In Python, fall back to duck typing (hasattr 'seek' / 'read') with explicit error messages for unsupported objects.

## Counter / Caveats

- Seekable requirement excludes pipes / stdin; buffer first if you need to support them.
- Reading whole-file into &[u8] or BytesIO loses the streaming benefit; design APIs to discourage it.
- Async trait objects (Box<dyn AsyncInput>) lose monomorphization; trade ergonomics vs perf.
- metadata().len() can be wrong on sparse / special files (/dev/random returns u64::MAX).

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `rust/lib/src/input.rs:15-102`
- `python/src/magika/magika.py:139-210`
- `go/magika/scanner.go:48-54`
