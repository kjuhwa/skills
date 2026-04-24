# beg-mid-end-file-sampling-with-padding — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `go/magika/features.go:23-48`
- `rust/lib/src/input.rs:28-42`
- `js/src/model-features.ts:15-62`
- `assets/models/standard_v3_3/config.min.json`

## When this pattern is a fit

Preprocessing variable-length file content for a small NN that requires fixed-size input and must keep inference latency independent of file size.

## When to walk away

- padding_token must be outside the byte range (0-255); 256 is the canonical choice.
- Middle-block reads can land at negative offsets when file_size < mid_size; clamp to [0, file_size).
- All bindings MUST read blocks in the same order (beg, mid, end) — otherwise inference parity breaks silently.
- Files >2GB on 32-bit hosts need 64-bit offsets; test at the 4GB boundary explicitly.
