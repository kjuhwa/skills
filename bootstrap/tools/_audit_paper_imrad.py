#!/usr/bin/env python3
"""IMRaD body-structure advisory for paper/<…>/PAPER.md.

The paper schema's body has historically been free-form ('Premise / Background /
Perspectives / Limitations / Provenance' was a convention, not a contract). To raise
the layer toward the international-paper standard (Introduction / Methods / Results /
Discussion), this audit reports per-paper compliance with the IMRaD section structure.

Required sections per type:
  type=hypothesis  →  Introduction, Methods, Results, Discussion (full IMRaD)
  type=survey      →  Introduction, Discussion (Methods/Results omitted — surveys
                      summarize a landscape rather than running a single experiment)
  type=position    →  Introduction, Discussion (no experiment to report)

Before-loop status (status ∈ {draft, reviewed}):
  Methods may carry the *planned* experiment design; Results may say 'pending' or be
  absent. The audit flags Methods/Results only as advisory, not error, until the
  paper transitions to status=implemented.

After-loop status (status=implemented):
  All four sections must be present and non-trivial (≥ 80 chars body each).

Output is informational; the audit emits exit code 0 even when papers are
non-compliant, matching the falsifiability and orphan audits.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"

REQUIRED_BY_TYPE = {
    "hypothesis": ["Introduction", "Methods", "Results", "Discussion"],
    "survey":     ["Introduction", "Discussion"],
    "position":   ["Introduction", "Discussion"],
}

MIN_SECTION_BODY = 80   # chars; below this counts as 'present but trivial'

HEADING_RE = re.compile(r"(?m)^##\s+(.+?)\s*$")


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        return "", text
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text
    return text[4 : end + 1], text[end + len("\n---\n") :]


def parse_frontmatter(fm_text: str) -> dict:
    if not fm_text:
        return {}
    try:
        return yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        return {}


def collect_sections(body: str) -> dict[str, int]:
    """Return {heading_text: body_length_chars}. Body length excludes managed-block markers."""
    matches = list(HEADING_RE.finditer(body))
    sections: dict[str, int] = {}
    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        chunk = body[start:end]
        # Strip the managed References/Build-deps block if it's inside this section
        chunk = re.sub(
            r"<!-- references-section:begin -->.*?<!-- references-section:end -->\n*",
            "",
            chunk,
            flags=re.DOTALL,
        )
        sections[heading] = len(chunk.strip())
    return sections


def check_paper(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, body = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    paper_type = (fm.get("type") or "hypothesis").strip()
    status = (fm.get("status") or "").strip()
    required = REQUIRED_BY_TYPE.get(paper_type, REQUIRED_BY_TYPE["hypothesis"])
    sections = collect_sections(body)

    findings = []
    for required_heading in required:
        # Match either exact "Introduction" or anything starting with "Introduction —"
        match_keys = [k for k in sections if k == required_heading or k.startswith(f"{required_heading} ")]
        if not match_keys:
            findings.append({"heading": required_heading, "issue": "missing"})
        else:
            length = max(sections[k] for k in match_keys)
            # Methods / Results are stricter only when status=implemented
            strict_threshold = MIN_SECTION_BODY
            if required_heading in ("Methods", "Results") and status != "implemented":
                strict_threshold = 0  # only check presence, not length, while still in draft
            if length < strict_threshold:
                findings.append({"heading": required_heading, "issue": "trivial", "chars": length})

    return {
        "slug": path.relative_to(PAPER_DIR).parent.as_posix(),
        "type": paper_type,
        "status": status,
        "sections_found": sorted(sections.keys()),
        "findings": findings,
        "compliant": not findings,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only-flagged", action="store_true")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    rows = [check_paper(p_) for p_ in sorted(PAPER_DIR.glob("**/PAPER.md"))]
    flagged = [r for r in rows if not r["compliant"]]

    if args.only_flagged:
        rows = flagged

    if args.json:
        print(json.dumps({
            "summary": {"audited": len(rows), "compliant": len(rows) - len(flagged), "flagged": len(flagged)},
            "rows": rows,
        }, indent=2, ensure_ascii=False))
        return 0

    if not rows:
        print("No papers in scope.")
        return 0

    for r in rows:
        marker = "  ! " if not r["compliant"] else "    "
        sec_count = len(r["sections_found"])
        print(f"{marker}{r['type']:<10} status={r['status']:<12} sections={sec_count:<3} {r['slug']}")
        for f in r["findings"]:
            if f["issue"] == "missing":
                print(f"        missing: ## {f['heading']}")
            elif f["issue"] == "trivial":
                print(f"        trivial: ## {f['heading']}  ({f['chars']} chars, want ≥ {MIN_SECTION_BODY})")

    if flagged:
        print(
            f"\n{len(flagged)}/{len(rows) if not args.only_flagged else (len(rows) + 0)} paper(s) "
            "non-compliant with IMRaD body structure (see docs/rfc/paper-schema-draft.md §5). "
            "Hypothesis papers need Introduction / Methods / Results / Discussion; "
            "survey/position papers need Introduction / Discussion. "
            "Methods + Results section length only enforced for status=implemented."
        )
    else:
        print(f"\nAll {len(rows)} paper(s) compliant with IMRaD body structure.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
