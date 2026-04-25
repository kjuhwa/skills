#!/usr/bin/env python3
"""One-shot migration helper: rewrites a legacy paper body into IMRaD layout.

Legacy body convention (pre-v0.2.2):
  ## Premise
  ## Background
  ## (auto-injected references-section block — preserved verbatim by position)
  ## Perspectives
  ## External Context
  ## Proposed Builds
  ## Open Questions
  ## Limitations
  ## Provenance

IMRaD body convention (v0.2.2+):
  ## Introduction        (opening + Background subsection + Prior art subsection)
  ## Methods             (hypothesis only; stub for drafts)
  ## Results             (hypothesis only; stub `(pending)` for drafts)
  ## Discussion          (Perspectives + Proposed-build rationale + Limitations + Future work)
  ## (auto-injected references-section block — placed by _inject_references_section.py)
  ## Provenance

The migration is structural — content is moved between sections, not rewritten.
For hypothesis papers in draft, Methods + Results sections are added as stubs
(satisfying the IMRaD audit's presence requirement; substance is enforced only
at status=implemented).

Idempotent: a paper already in IMRaD layout (i.e., already has Introduction,
Methods, Results, Discussion at the top level) is left unchanged.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"

H2_RE = re.compile(r"(?m)^##\s+(.+?)\s*$")
MANAGED_RE = re.compile(
    r"<!-- references-section:begin -->.*?<!-- references-section:end -->\n*",
    re.DOTALL,
)


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text
    return text[: end + len("\n---\n")], text[end + len("\n---\n") :]


def parse_frontmatter(fm_text: str) -> dict:
    if not fm_text.startswith("---\n"):
        return {}
    inner = fm_text[4:]
    if inner.endswith("---\n"):
        inner = inner[:-4]
    try:
        return yaml.safe_load(inner) or {}
    except yaml.YAMLError:
        return {}


def split_sections(body: str) -> list[tuple[str, str]]:
    """Return [(heading_or_None, content_chunk)]. The first item with heading=None
    captures any preamble before the first '## ' heading (typically the title line)."""
    matches = list(H2_RE.finditer(body))
    if not matches:
        return [(None, body)]
    sections: list[tuple[str, str]] = []
    if matches[0].start() > 0:
        sections.append((None, body[: matches[0].start()]))
    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        chunk_start = m.end()
        chunk_end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        sections.append((heading, body[chunk_start:chunk_end]))
    return sections


def already_imrad(headings: list[str]) -> bool:
    """If body already has Introduction / Methods / Results / Discussion as top-level
    headings, treat as IMRaD-converted. Survey/position papers without Methods+Results
    but with Introduction + Discussion also count as IMRaD-shaped."""
    has_intro = any(h.startswith("Introduction") for h in headings if h)
    has_discussion = any(h.startswith("Discussion") for h in headings if h)
    return has_intro and has_discussion


def is_managed_block(content: str) -> bool:
    """Check if content is purely the auto-injected references-section block."""
    stripped = content.strip()
    return stripped.startswith("<!-- references-section:begin -->") and \
           stripped.endswith("<!-- references-section:end -->")


def migrate_body(body: str, paper_type: str, status: str) -> tuple[str, bool]:
    """Return (new_body, mutated_flag). If already IMRaD or unrecognized, leave as-is."""
    # Critical: strip the auto-injected references-section block from the WHOLE body
    # BEFORE splitting into sections. The block contains '## ' headings (e.g.
    # '## References (examines)', '## Build dependencies') which would otherwise
    # be parsed as top-level sections, leaving the begin/end markers split across
    # those false sections — and breaking the downstream injector's MANAGED_RE
    # match (which would then delete the IMRaD body wholesale on the next run).
    references_block = ""
    m = MANAGED_RE.search(body)
    if m:
        references_block = m.group(0)
        body = MANAGED_RE.sub("", body)

    sections = split_sections(body)
    headings = [h for h, _ in sections if h]

    if already_imrad(headings):
        # Re-attach the references_block we stripped — the body was already IMRaD
        # but we still need to put the managed block back so the file is unchanged.
        # Place it before Provenance if present, else append.
        if references_block:
            prov_match = re.search(r"(?m)^## Provenance[ \t]*$", body)
            if prov_match:
                body = body[: prov_match.start()] + references_block.rstrip() + "\n\n" + body[prov_match.start() :]
            else:
                body = body.rstrip() + "\n\n" + references_block.rstrip() + "\n"
        return body, False

    # Bucket legacy sections
    preamble_chunk = ""
    premise_chunk = ""
    background_chunk = ""
    external_chunk = ""
    perspectives_chunk = ""
    proposed_builds_chunk = ""
    open_questions_chunk = ""
    limitations_chunk = ""
    provenance_chunk = ""
    other_chunks: list[tuple[str, str]] = []
    # references_block is already stripped from the whole body above; sections do
    # not contain begin/end markers anymore.

    for heading, content in sections:
        if heading is None:
            preamble_chunk = content
            continue
        h_lower = heading.lower()
        if h_lower == "premise":
            premise_chunk = content.strip()
        elif h_lower == "background":
            background_chunk = content.strip()
        elif h_lower == "external context":
            external_chunk = content.strip()
        elif h_lower == "perspectives":
            perspectives_chunk = content.strip()
        elif h_lower == "proposed builds":
            proposed_builds_chunk = content.strip()
        elif h_lower in ("open questions", "future work"):
            open_questions_chunk = content.strip()
        elif h_lower == "limitations":
            limitations_chunk = content.strip()
        elif h_lower == "provenance":
            provenance_chunk = content.strip()
        else:
            other_chunks.append((heading, content.strip()))

    # Build IMRaD body
    out: list[str] = []
    if preamble_chunk:
        out.append(preamble_chunk.rstrip() + "\n\n")

    # Introduction
    out.append("## Introduction\n\n")
    if premise_chunk:
        out.append(premise_chunk + "\n\n")
    if background_chunk:
        out.append("### Background\n\n")
        out.append(background_chunk + "\n\n")
    if external_chunk:
        out.append("### Prior art\n\n")
        out.append(external_chunk + "\n\n")

    # Methods + Results — only for hypothesis papers
    if paper_type == "hypothesis":
        out.append("## Methods\n\n")
        out.append(
            "(planned — see `experiments[0].method` in frontmatter for the full design. "
            "This section becomes substantive when `status: implemented` and is checked "
            "for length by `_audit_paper_imrad.py` at that point.)\n\n"
        )
        out.append("## Results\n\n")
        out.append(
            "(pending — experiment status: planned. "
            "Run `/hub-paper-experiment-run <slug>` once the experiment completes to "
            "populate this section from `experiments[0].result`.)\n\n"
        )

    # Discussion
    out.append("## Discussion\n\n")
    if perspectives_chunk:
        out.append(perspectives_chunk + "\n\n")
    if proposed_builds_chunk:
        out.append("### Proposed builds (rationale)\n\n")
        out.append(proposed_builds_chunk + "\n\n")
    if limitations_chunk:
        out.append("### Limitations\n\n")
        out.append(limitations_chunk + "\n\n")
    if open_questions_chunk:
        out.append("### Future work\n\n")
        out.append(open_questions_chunk + "\n\n")

    # Other unrecognized chunks (rare; preserve at end of Discussion to avoid losing data)
    for h, c in other_chunks:
        out.append(f"### {h}\n\n{c}\n\n")

    # References block — re-inject managed block (will be repositioned by the injector)
    if references_block:
        out.append(references_block.rstrip() + "\n\n")

    # Provenance
    if provenance_chunk:
        out.append("## Provenance\n\n")
        # Append migration note
        migration_note = (
            "- Body migrated to IMRaD structure 2026-04-25 per "
            "`docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. "
            "Pre-IMRaD body is preserved in git history; no semantic claims were "
            "rewritten during the migration. For hypothesis-type drafts, Methods + "
            "Results sections are stubs until the experiment completes."
        )
        if migration_note not in provenance_chunk:
            out.append(provenance_chunk + "\n" + migration_note + "\n")
        else:
            out.append(provenance_chunk + "\n")

    return "".join(out), True


def process(path: Path, write: bool) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    fm_text, body = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    paper_type = (fm.get("type") or "hypothesis").strip()
    status = (fm.get("status") or "").strip()
    new_body, mutated = migrate_body(body, paper_type, status)
    if not mutated:
        return False, "already-imrad-or-unrecognized"
    new_text = fm_text + new_body
    if new_text == text:
        return False, "no-change"
    if write:
        path.write_text(new_text, encoding="utf-8")
    return True, "migrated"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--write", action="store_true")
    p.add_argument("--path", help="Operate on a single PAPER.md path")
    p.add_argument("--limit", type=int, default=0)
    args = p.parse_args()

    if args.path:
        targets = [Path(args.path).resolve()]
    else:
        targets = sorted(PAPER_DIR.glob("**/PAPER.md"))
        if args.limit:
            targets = targets[: args.limit]

    changed = 0
    for path in targets:
        mutated, status = process(path, args.write)
        rel = path.relative_to(HUB_ROOT).as_posix() if str(path).startswith(str(HUB_ROOT)) else str(path)
        if mutated:
            changed += 1
            print(f"[{'WRITE' if args.write else 'DRY '}] {rel} — {status}")
        else:
            print(f"[SKIP ] {rel} — {status}")
    mode = "applied" if args.write else "dry-run"
    print(f"\n{mode}: {changed}/{len(targets)} papers migrated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
