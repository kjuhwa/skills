# github-actions-parallel-test-matrix — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `.github/workflows/rust-test.yml:1-60`
- `.github/workflows/python-build-and-release-package.yml:74-120`

## When this pattern is a fit

Multi-language project that must validate on Linux + macOS + Windows × stable + nightly without serial CI.

## When to walk away

- Matrix explosion (3 OS × N toolchains) burns CI minutes — macOS and Windows are ~10x more expensive on free tier.
- Flaky tests can fail on one cell and pass on another; quarantine flaky ones rather than rerunning blindly.
- Setup time often dominates short test suites; cache aggressively.
- 5GB artifact cap on free tier means you must clean up after large workflows.
