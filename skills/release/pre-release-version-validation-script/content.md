# pre-release-version-validation-script — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `python/scripts/pre_release_check.py:1-60`
- `.github/workflows/python-build-and-release-package.yml:50-70`

## When this pattern is a fit

Automating a release pipeline and adding guard rails so you never publish a broken or mis-tagged package.

## When to walk away

- Copyright regex is fragile; comment styles vary across languages and decades.
- Tag-to-version extraction must be consistent — off-by-one or prefix-mismatch is a common bug.
- Type checking can be slow on large codebases; parallelize or cache.
- The script is language-specific; you'll want similar guards in every binding (Cargo.toml version, package.json version).
