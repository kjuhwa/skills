# content-type-info-metadata-embedding — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/gen/src/main.rs:65-82`
- `python/src/magika/types/content_type_info.py`
- `js/src/content-type-info.ts`
- `go/magika/content.go`

## When this pattern is a fit

Building a classifier whose output needs human-readable enrichment (MIME type, file extensions, broad category) at every call site.

## When to walk away

- Metadata can be stale or wrong for obscure types; validate against real samples occasionally.
- MIME type is not 1-to-1 with label (e.g. .txt vs text/markdown); use is_text for binary/text filtering.
- Extensions list grows over time; document the preferred extension explicitly.
- Custom group taxonomy may not align with IANA / file(1) groups; document the difference for integrators.
