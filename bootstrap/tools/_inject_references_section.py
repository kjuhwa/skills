#!/usr/bin/env python3
"""Inject vertical, narrow-friendly References / Composes sections into PAPER.md / TECHNIQUE.md bodies.

Frontmatter stays canonical (machine-readable). The body section mirrors the same data
in a stacked Markdown form so humans reading the raw file don't need horizontal scroll
to follow long `role` strings.

Idempotent: re-running replaces existing managed sections rather than duplicating them.
Managed sections are bounded by HTML comments so we can detect & replace cleanly.

Insertion points:
  - Paper:     before `## Perspectives` (sections: examines, build-dependencies)
  - Technique: before `## When to use`  (sections: composes)
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"
TECHNIQUE_DIR = HUB_ROOT / "technique"

BEGIN_MARK = "<!-- references-section:begin -->"
END_MARK = "<!-- references-section:end -->"
MANAGED_RE = re.compile(
    re.escape(BEGIN_MARK) + r".*?" + re.escape(END_MARK) + r"\n*",
    re.DOTALL,
)


def split_frontmatter(text: str) -> tuple[str, str, str]:
    """Return (raw_frontmatter_with_fences, body, eol). Empty fences if not present."""
    if not text.startswith("---\n"):
        return "", text, "\n"
    end = text.find("\n---\n", 4)
    if end == -1:
        return "", text, "\n"
    fm = text[: end + len("\n---\n")]
    body = text[end + len("\n---\n") :]
    return fm, body, "\n"


def parse_frontmatter(fm_block: str) -> dict:
    if not fm_block:
        return {}
    inner = fm_block.strip()
    if inner.startswith("---"):
        inner = inner[3:]
    if inner.endswith("---"):
        inner = inner[:-3]
    try:
        return yaml.safe_load(inner) or {}
    except yaml.YAMLError:
        return {}


def render_entry(entry: dict) -> str:
    kind = (entry.get("kind") or "").strip()
    ref = (entry.get("ref") or "").strip()
    note = (entry.get("note") or "").strip()
    role = (entry.get("role") or "").strip()
    version = entry.get("version")
    head = f"**{kind} — `{ref}`**"
    if version:
        head += f"  _(version: `{version}`)_"
    description = note or role
    if description:
        return f"{head}\n{description}\n"
    return f"{head}\n"


def render_paper_examines(fm: dict) -> str | None:
    entries = fm.get("examines") or []
    if not entries:
        return None
    blocks = [render_entry(e) for e in entries if isinstance(e, dict)]
    if not blocks:
        return None
    body = "\n".join(blocks)
    return f"## References (examines)\n\n{body}"


def render_paper_build_deps(fm: dict) -> str | None:
    builds = fm.get("proposed_builds") or []
    sections: list[str] = []
    for build in builds:
        if not isinstance(build, dict):
            continue
        slug = (build.get("slug") or "").strip()
        scope = (build.get("scope") or "").strip()
        requires = build.get("requires") or []
        if not requires:
            continue
        head_line = f"### `{slug}`"
        if scope:
            head_line += f"  _(scope: {scope})_"
        entries = "\n".join(render_entry(e) for e in requires if isinstance(e, dict))
        sections.append(f"{head_line}\n\n{entries}")
    if not sections:
        return None
    return "## Build dependencies (proposed_builds)\n\n" + "\n".join(sections)


def render_technique_composes(fm: dict) -> str | None:
    entries = fm.get("composes") or []
    if not entries:
        return None
    blocks = [render_entry(e) for e in entries if isinstance(e, dict)]
    if not blocks:
        return None
    body = "\n".join(blocks)
    return f"## Composes\n\n{body}"


def build_managed_block(*sections: str | None) -> str:
    parts = [s for s in sections if s]
    if not parts:
        return ""
    inner = "\n\n".join(parts)
    return f"{BEGIN_MARK}\n{inner}\n{END_MARK}\n"


def remove_existing_managed(body: str) -> str:
    return MANAGED_RE.sub("", body)


def insert_before_heading(body: str, heading: str, block: str) -> tuple[str, bool]:
    """Insert `block` immediately before the first occurrence of `heading` (e.g. '## Perspectives').

    Returns (new_body, inserted_flag).
    If heading is not found, append to end.
    """
    if not block:
        return body, False
    pat = re.compile(rf"(?m)^{re.escape(heading)}[ \t]*$")
    m = pat.search(body)
    if not m:
        sep = "" if body.endswith("\n\n") else ("\n" if body.endswith("\n") else "\n\n")
        return body + sep + block + "\n", True
    return body[: m.start()] + block + "\n" + body[m.start() :], True


def process_paper(path: Path, write: bool) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    fm_block, body, _ = split_frontmatter(text)
    fm = parse_frontmatter(fm_block)

    examines_section = render_paper_examines(fm)
    build_deps_section = render_paper_build_deps(fm)
    block = build_managed_block(examines_section, build_deps_section)

    cleaned_body = remove_existing_managed(body)
    if not block:
        new_body = cleaned_body
    else:
        new_body, _ = insert_before_heading(cleaned_body, "## Perspectives", block)

    new_text = fm_block + new_body
    if new_text == text:
        return False, "unchanged"
    if write:
        path.write_text(new_text, encoding="utf-8")
    return True, "updated"


def process_technique(path: Path, write: bool) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    fm_block, body, _ = split_frontmatter(text)
    fm = parse_frontmatter(fm_block)

    composes_section = render_technique_composes(fm)
    block = build_managed_block(composes_section)

    cleaned_body = remove_existing_managed(body)
    if not block:
        new_body = cleaned_body
    else:
        new_body, _ = insert_before_heading(cleaned_body, "## When to use", block)

    new_text = fm_block + new_body
    if new_text == text:
        return False, "unchanged"
    if write:
        path.write_text(new_text, encoding="utf-8")
    return True, "updated"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--write", action="store_true", help="Apply changes (default: dry-run)")
    p.add_argument("--only", choices=["paper", "technique"], help="Restrict scope")
    p.add_argument("--limit", type=int, default=0, help="Limit files processed (0 = no limit)")
    args = p.parse_args()

    write = args.write
    paper_paths = sorted(PAPER_DIR.glob("**/PAPER.md")) if args.only != "technique" else []
    tech_paths = sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md")) if args.only != "paper" else []
    targets = paper_paths + tech_paths
    if args.limit:
        targets = targets[: args.limit]

    changed = 0
    for path in targets:
        kind = "paper" if "PAPER.md" in path.name else "technique"
        if kind == "paper":
            mutated, status = process_paper(path, write)
        else:
            mutated, status = process_technique(path, write)
        rel = path.relative_to(HUB_ROOT).as_posix()
        if mutated:
            changed += 1
            print(f"[{'WRITE' if write else 'DRY '}] {rel} — {status}")
        else:
            print(f"[SKIP ] {rel} — {status}")

    mode = "applied" if write else "dry-run"
    print(f"\n{mode}: {changed}/{len(targets)} files changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
