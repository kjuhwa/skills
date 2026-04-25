#!/usr/bin/env python3
"""Split long `role:` strings in paper/technique frontmatter into compact label + optional `note:`.

Why: GitHub's preview renders YAML frontmatter as nested tables. Long role strings
force horizontal scroll on narrow viewports. Keeping role as a compact label and
moving the prose to a sibling `note:` field shortens the table cells without
losing information — `_inject_references_section.py` displays `note` if present,
otherwise `role`, in the body's References / Composes section.

Strategy per role line:
  - len(value) <= THRESHOLD            → unchanged
  - contains " — " or similar splitter → split at first occurrence; head becomes role, full original becomes note
  - no clean splitter                  → first ~4 words become role, full original becomes note

Operates as line-level text edits on the frontmatter only — does not round-trip
the YAML, so comments and formatting are preserved everywhere else.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"
TECHNIQUE_DIR = HUB_ROOT / "technique"

THRESHOLD = 30  # roles up to this length stay as-is
HEAD_MAX = 35   # an emerging short label must fit under this
SPLITTERS = [" — ", " -- ", " - ", ": "]

ROLE_RE = re.compile(r'^(?P<indent>\s+)role:\s*(?P<value>.+?)\s*$')


def parse_value(raw: str) -> tuple[str, str]:
    """Return (unquoted, quote_style) where quote_style is '"', "'" or ''."""
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ('"', "'"):
        return raw[1:-1], raw[0]
    return raw, ""


def quote_value(value: str, original_quote: str) -> str:
    if original_quote:
        # preserve user's quoting style
        return f"{original_quote}{value}{original_quote}"
    if any(ch in value for ch in [':', '#', '"', "'", '\n']):
        # need quoting; pick double quotes and escape any
        return '"' + value.replace('"', '\\"') + '"'
    return value


STOPWORDS = {"the", "a", "an", "this", "that", "to", "of", "in", "on", "for", "with", "by", "from"}


def make_keyword_label(value: str) -> str:
    """Build a kebab-cased label from the first 1-2 meaningful keywords."""
    words = re.findall(r"[A-Za-z][\w-]*", value)
    cleaned = [w for w in words if w.lower() not in STOPWORDS]
    if not cleaned:
        return value[:HEAD_MAX].rstrip().lower()
    label = cleaned[0].lower()
    if len(label) < 10 and len(cleaned) >= 2:
        candidate = f"{label}-{cleaned[1].lower()}"
        if len(candidate) <= HEAD_MAX:
            label = candidate
    return label


def split_role(value: str) -> tuple[str, str | None]:
    """Return (role_value, note_value_or_none)."""
    if len(value) <= THRESHOLD:
        return value, None
    for delim in SPLITTERS:
        idx = value.find(delim)
        if idx == -1:
            continue
        head = value[:idx].strip()
        if 2 <= len(head) <= HEAD_MAX:
            return head, value
    return make_keyword_label(value), value


def split_frontmatter_bounds(text: str) -> tuple[int, int] | None:
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---\n", 4)
    if end == -1:
        return None
    return 4, end + 1  # frontmatter content starts after first ---\n, ends at \n--- (excluding trailing)


def transform_frontmatter(fm_text: str) -> tuple[str, int]:
    """Return (new_fm_text, lines_added). Operates on the frontmatter content only."""
    lines = fm_text.split("\n")
    out: list[str] = []
    added = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        m = ROLE_RE.match(line)
        if not m:
            out.append(line)
            i += 1
            continue
        indent = m.group("indent")
        raw = m.group("value")
        value, quote = parse_value(raw)
        new_role, note = split_role(value)
        if note is None:
            out.append(line)
            i += 1
            continue
        # check whether the next line is already a note: at the same indent (idempotent)
        next_line = lines[i + 1] if (i + 1) < len(lines) else ""
        already_has_note = next_line.lstrip().startswith("note:") and next_line.startswith(indent)
        out.append(f"{indent}role: {quote_value(new_role, quote)}")
        if already_has_note:
            # leave the existing note untouched
            out.append(next_line)
            i += 2
        else:
            out.append(f"{indent}note: {quote_value(note, '')}")
            added += 1
            i += 1
    return "\n".join(out), added


def process_file(path: Path, write: bool) -> tuple[bool, int]:
    text = path.read_text(encoding="utf-8")
    bounds = split_frontmatter_bounds(text)
    if bounds is None:
        return False, 0
    fm_start, fm_end = bounds
    fm_text = text[fm_start:fm_end]
    new_fm, added = transform_frontmatter(fm_text)
    if added == 0 and new_fm == fm_text:
        return False, 0
    new_text = text[:fm_start] + new_fm + text[fm_end:]
    if new_text == text:
        return False, 0
    if write:
        path.write_text(new_text, encoding="utf-8")
    return True, added


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--write", action="store_true", help="Apply changes (default: dry-run)")
    p.add_argument("--only", choices=["paper", "technique"])
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--path", help="Operate on a single file path (overrides --only)")
    args = p.parse_args()

    if args.path:
        targets = [Path(args.path).resolve()]
    else:
        paper_paths = sorted(PAPER_DIR.glob("**/PAPER.md")) if args.only != "technique" else []
        tech_paths = sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md")) if args.only != "paper" else []
        targets = paper_paths + tech_paths
        if args.limit:
            targets = targets[: args.limit]

    changed = 0
    total_added = 0
    for path in targets:
        mutated, added = process_file(path, args.write)
        rel = path.relative_to(HUB_ROOT).as_posix() if str(path).startswith(str(HUB_ROOT)) else str(path)
        if mutated:
            changed += 1
            total_added += added
            print(f"[{'WRITE' if args.write else 'DRY '}] {rel} — +{added} note(s)")
        else:
            print(f"[SKIP ] {rel} — no long roles")

    mode = "applied" if args.write else "dry-run"
    print(f"\n{mode}: {changed}/{len(targets)} files changed, {total_added} notes added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
