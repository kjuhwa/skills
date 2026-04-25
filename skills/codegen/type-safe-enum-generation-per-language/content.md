# type-safe-enum-generation-per-language — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/gen/src/main.rs:40-100`
- `python/src/magika/types/content_type_label.py:19-50`
- `js/src/content-type-label.ts`

## When this pattern is a fit

You support 300+ string-keyed types and want compile-time validation in every language without hand-maintaining four enum lists.

## When to walk away

- Label normalization rules differ per language; keep them in one place.
- Rust enums with 300+ variants slow compile time noticeably; non_exhaustive helps downstream evolution.
- Index stability matters if downstream uses int indices for array lookups; renumbering breaks model output mappings.
- Tooling (rust-analyzer, pyright) needs the generated files to exist before it can resolve symbols — generate before checkout-time tasks.
