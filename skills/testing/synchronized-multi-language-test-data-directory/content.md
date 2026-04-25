# synchronized-multi-language-test-data-directory — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `tests_data/basic/ (per-content-type subdirs)`
- `tests_data/features_extraction/`
- `python/tests/`
- `go/cli/cli_test.go`

## When this pattern is a fit

Multi-language project where every binding must be tested against the same corpus to guarantee parity.

## When to walk away

- Test files inflate repo size; cap at ~100KB each or use git-lfs.
- Some types need rich examples (PDF/DOCX with text+images+metadata); others need a single byte.
- CRLF/LF line ending drift silently breaks reference comparisons.
- Maintaining the corpus is manual labor; budget time per release to keep it healthy.
