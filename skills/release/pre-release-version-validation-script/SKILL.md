---
name: pre-release-version-validation-script
description: Pre-release script validates: tag matches pyproject version, copyright headers exist on all source files, package metadata fields complete, type checker passes.
category: release
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, release]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Pre Release Version Validation Script

**Trigger:** Automating a release pipeline and adding guard rails so you never publish a broken or mis-tagged package.

## Steps

- Read the git tag from $GITHUB_REF_NAME or env var; extract the version (strip prefix like 'python-v').
- Compare against pyproject.toml [project].version; exit 1 on mismatch.
- Walk source files and check for the copyright header (regex); list all offenders if any are missing.
- Validate that name, version, author, license, urls are all populated in pyproject.toml.
- Run mypy / type checker; fail on any error.
- Optionally check that the package name is taken on PyPI (via API) — guards against typos.

## Counter / Caveats

- Copyright regex is fragile; comment styles vary across languages and decades.
- Tag-to-version extraction must be consistent — off-by-one or prefix-mismatch is a common bug.
- Type checking can be slow on large codebases; parallelize or cache.
- The script is language-specific; you'll want similar guards in every binding (Cargo.toml version, package.json version).

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `python/scripts/pre_release_check.py:1-60`
- `.github/workflows/python-build-and-release-package.yml:50-70`
