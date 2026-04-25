# Preprint — `parallel-dispatch-breakeven-point`

LaTeX preprint counterpart of [`paper/workflow/parallel-dispatch-breakeven-point/PAPER.md`](../PAPER.md). For venues that need a PDF (arXiv, OpenReview, workshop submissions), this directory carries an arXiv-compatible `paper.tex` rendered from the same content.

## Source of truth

The frontmatter + IMRaD body in `../PAPER.md` is the canonical source. This `paper.tex` is hand-mirrored from that body and is **not** auto-generated. When the source paper changes, this file must be updated alongside it (a future tool `_paper_to_latex.py` could automate this; out of scope for the initial preprint).

## Build

```bash
bash build.sh
```

Requires `pdflatex` + `bibtex` (TeX Live, MacTeX, MiKTeX). Outputs `paper.pdf` alongside the source. The build runs `pdflatex` three times (once for layout, once for `\ref` resolution, once for the final TOC) plus `bibtex` between passes — standard for `article`-class papers with a bibliography.

## Files

| File | Purpose |
|---|---|
| `paper.tex` | LaTeX source. `article` class for portability across arXiv / OpenReview / workshop templates. |
| `references.bib` | BibTeX file. Empty in v1 — `external_refs[]` in the host paper is currently `[]`. Populates as `/hub-research` adds external context. |
| `build.sh` | Convenience build script. |
| `paper.pdf` | Build artifact (gitignored). |

## Submission target

Not yet submitted. The paper's premise and experiment are complete (`status: implemented` with `supports_premise: partial`), and the IMRaD body is publication-shaped. Candidate venues:

- **arXiv** (cs.SE / cs.AI) — preprint, no peer review. Requires institutional endorsement on first submission to a category. Length is fine (~750 words; arXiv has no minimum).
- **Workshop submissions** — venues focused on LLM tooling, agent frameworks, or developer tooling at large CS conferences. The paper's contribution (a falsified-then-refined cost gate for agent dispatch) fits the "negative result / partial refute" track at such venues.
- **Internal team-blog or company tech-blog** — for organizations using LLM agent pipelines internally; the paper reads as a research note documenting an internal finding.

## Why this exists

The host catalog's `paper/` layer ships papers as schema-validated YAML+Markdown. That format is great for tooling integration, citation graphs, and the closed-loop verification flow. It is not the format reviewers and venues expect. This directory bridges that gap for one paper as a worked example; future closed-loop papers can follow the same pattern (drop a `preprint/` directory, hand-render `paper.tex` from the IMRaD body).

## What it does NOT do

- Auto-render from PAPER.md. A future `bootstrap/tools/_paper_to_latex.py` could do this; out of scope here.
- Auto-submit. arXiv submission requires a real account, optional institutional endorsement, and human review of the rendered PDF. This directory just produces the PDF.
- Track citations to/from the preprint after submission. That's a separate concern handled by the host catalog's `citations.json` for internal references and by external indexing services (Google Scholar, Semantic Scholar) for academic citations once the paper is publicly visible.

## Provenance

- Authored 2026-04-25 as the first preprint companion in the host catalog. Mirrors the IMRaD body structure documented in `docs/rfc/paper-schema-draft.md` §5.
- Closed-loop status: experiment ran 2026-04-24 and partially refuted the original 70%-coverage premise; the paper rewrote itself to use absolute useful-output count instead. The preprint reflects the refined claim, not the original.
