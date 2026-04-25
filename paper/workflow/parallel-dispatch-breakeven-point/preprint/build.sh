#!/usr/bin/env bash
# Build the preprint PDF. Requires a TeX distribution with pdflatex + bibtex.
#
# Outputs paper.pdf alongside the source. Aux files (.aux, .log, .out, .bbl,
# .blg) are also written; the .gitignore in this directory excludes them.

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v pdflatex >/dev/null 2>&1; then
  echo "[error] pdflatex not found. Install TeX Live or MacTeX." >&2
  exit 1
fi

pdflatex -interaction=nonstopmode paper.tex
# bibtex is a no-op while references.bib is empty; left in the pipeline so the
# build is ready when external_refs[] is populated by /hub-research.
if command -v bibtex >/dev/null 2>&1; then
  bibtex paper || true
fi
pdflatex -interaction=nonstopmode paper.tex
pdflatex -interaction=nonstopmode paper.tex

echo
echo "Built paper.pdf — $(du -h paper.pdf 2>/dev/null | cut -f1 || echo "size unknown")"
