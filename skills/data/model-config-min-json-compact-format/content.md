# model-config-min-json-compact-format — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `assets/models/standard_v3_3/config.min.json`
- `rust/lib/src/config.rs`
- `go/magika/config.go:10-31`

## When this pattern is a fit

Distributing an ML model with metadata that must be parsable from every language without a custom binary format.

## When to walk away

- Minified JSON is unreadable for debugging; always keep a pretty source-of-truth.
- Schema changes need version bumps and migration notes.
- Threshold arrays of 300+ floats inflate the file; consider a sparse representation.
- Binary formats (protobuf, msgpack) win on size but lose universal portability.
