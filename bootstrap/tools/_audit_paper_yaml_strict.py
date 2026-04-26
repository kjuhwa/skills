#!/usr/bin/env python3
"""Strict-YAML compliance audit for frontmatter across paper/, technique/, knowledge/, and skills/.

PyYAML's safe_load is lenient about mid-string colons inside unquoted plain
scalars: it accepts strings like "Tradeoff: correctness vs throughput" as a
single value. GitHub's web UI and stricter YAML parsers (Ruby Psych, Go yaml.v3
in strict mode) reject these as malformed mappings.

This audit scans frontmatter line-by-line for unquoted plain scalars containing
mid-string ": " followed by an alpha character — the exact pattern that fails
under strict parsers but passes under PyYAML.

Background: this issue surfaced when paper #1151 merged with line 44 reading
`summary: ... Tradeoff: correctness vs throughput.`. The paper passed local
audits (PyYAML lenient) but GitHub's frontmatter renderer threw "mapping values
are not allowed in this context at line 43 column 173". Fix #1152 replaced ": "
with " — ". This audit prevents the next instance from slipping through.

Output is informational; exit code 0 even with offenders, matching the broader
audit fleet (_audit_paper_v03.py, _audit_paper_imrad.py, etc.).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# UTF-8 stdout reconfiguration so non-ASCII content (em-dash, ≥, ≤) doesn't
# crash on cp949 / cp1252 default consoles.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"
TECHNIQUE_DIR = HUB_ROOT / "technique"
KNOWLEDGE_DIR = HUB_ROOT / "knowledge"
SKILLS_DIR = HUB_ROOT / "skills"

# Match an unquoted scalar entry: <indent>(- )?<key>: <value>
# Captures (indent, list-marker, key, value) so the value can be inspected.
KV_LINE_RE = re.compile(r"^(\s*)(- )?([A-Za-z_][\w-]*): (.*)$")

# Block-scalar indicator at end of line — value is the literal | / > etc.
BLOCK_SCALAR_INDICATORS = {"|", ">", "|-", ">-", "|+", ">+", "|2", ">2", "|2-", ">2-"}

# A mid-string ": " followed by an alpha character is the strict-parser hazard.
# We anchor to mid-string by requiring the ": " to NOT be the first content of
# the value (it can't be — the line was already split on the first ": " by
# KV_LINE_RE). Any subsequent ": <letter>" is suspicious.
MID_STRING_COLON_RE = re.compile(r": [A-Za-z]")


def split_frontmatter_lines(text: str) -> tuple[int, int] | None:
    """Return (start_line_idx, end_line_idx) of the frontmatter block, or None."""
    if not text.startswith("---\n"):
        return None
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        return None
    for i, line in enumerate(lines[1:], start=1):
        if line == "---":
            return (1, i)  # frontmatter content lines are [1, i)
    return None


def line_indent(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def scan_frontmatter(path: Path) -> list[dict]:
    """Return offending entries: [{line, key, value, snippet}, ...]."""
    text = path.read_text(encoding="utf-8")
    fm_range = split_frontmatter_lines(text)
    if fm_range is None:
        return []
    fm_start, fm_end = fm_range
    lines = text.splitlines()

    offenders: list[dict] = []
    in_block_scalar = False
    block_scalar_indent = -1

    for line_idx in range(fm_start, fm_end):
        line = lines[line_idx]
        line_no = line_idx + 1  # 1-based for human display

        # If we're inside a block scalar, skip lines until indentation drops back.
        if in_block_scalar:
            if line.strip() == "" or line_indent(line) > block_scalar_indent:
                continue
            in_block_scalar = False  # fall through and re-evaluate this line

        m = KV_LINE_RE.match(line)
        if not m:
            continue

        indent_str, _list_marker, key, value = m.groups()
        value_stripped = value.rstrip()

        # Block-scalar starter (|, >, etc.) — switch state and skip
        if value_stripped in BLOCK_SCALAR_INDICATORS:
            in_block_scalar = True
            block_scalar_indent = len(indent_str)
            continue

        # Quoted values are safe — strict parser handles them
        if value_stripped.startswith(('"', "'")):
            continue

        # Empty / null / flow style — safe
        if value_stripped in ("", "[]", "{}", "null", "~"):
            continue

        # Flow-style mapping or list (e.g., {a: 1, b: 2}) — safe
        if value_stripped.startswith(("{", "[")):
            continue

        # The hazard: mid-string ": <letter>" in an unquoted plain scalar
        match = MID_STRING_COLON_RE.search(value_stripped)
        if match:
            # Build a short snippet around the hazard for the report
            offset = match.start()
            window_start = max(0, offset - 20)
            window_end = min(len(value_stripped), offset + 20)
            snippet = value_stripped[window_start:window_end]
            if window_start > 0:
                snippet = "…" + snippet
            if window_end < len(value_stripped):
                snippet = snippet + "…"
            offenders.append({
                "line": line_no,
                "key": key,
                "value_length": len(value_stripped),
                "hazard_offset": offset,
                "snippet": snippet,
            })

    return offenders


def check_file(path: Path, kind_label: str, slug: str) -> dict:
    offenders = scan_frontmatter(path)
    return {
        "kind": kind_label,
        "slug": slug,
        "offenders": offenders,
        "compliant": not offenders,
    }


def path_from_row(row: dict) -> Path:
    """Reconstruct the on-disk path from a row's kind + slug."""
    kind, slug = row["kind"], row["slug"]
    if kind == "paper":
        return PAPER_DIR / slug / "PAPER.md"
    if kind == "technique":
        return TECHNIQUE_DIR / slug / "TECHNIQUE.md"
    if kind == "knowledge":
        return KNOWLEDGE_DIR / f"{slug}.md"
    if kind == "skill":
        return SKILLS_DIR / slug / "SKILL.md"
    raise ValueError(f"unknown kind: {kind}")


# Used by apply_fix to relocate the offending line and quote-wrap its value.
KV_LINE_FIX_RE = re.compile(r"^(\s*)(- )?([\w-]+): (.+)$")


def apply_fix(row: dict, dry_run: bool = False) -> tuple[int, list[tuple[int, str, str]]]:
    """Quote-wrap offending values in this row's file.

    Returns (changes, preview) where preview is a list of (line_no, old, new)
    triples for printing. When dry_run=False, the file is written back.
    """
    if not row["offenders"]:
        return 0, []
    path = path_from_row(row)
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    preview: list[tuple[int, str, str]] = []
    changes = 0
    # Process in reverse line order so earlier offenders' line numbers stay
    # valid even when an earlier line's content is replaced (it isn't here —
    # quote-wrap doesn't add or remove lines — but reverse-order is the safe
    # convention if future fixes ever do).
    for offender in sorted(row["offenders"], key=lambda o: -o["line"]):
        line_idx = offender["line"] - 1
        if line_idx >= len(lines):
            continue
        line = lines[line_idx]
        m = KV_LINE_FIX_RE.match(line)
        if not m:
            continue
        indent, list_marker, k, value = m.groups()
        if k != offender["key"]:
            continue
        # Skip if already quoted (defensive — scan_frontmatter shouldn't have
        # flagged a quoted value, but tolerate audit/fix races).
        if value.startswith(('"', "'")):
            continue
        # Escape any internal double quotes.
        esc = value.replace('"', '\\"')
        new_line = f'{indent}{list_marker or ""}{k}: "{esc}"'
        preview.append((offender["line"], line, new_line))
        lines[line_idx] = new_line
        changes += 1
    if changes and not dry_run:
        path.write_text("\n".join(lines), encoding="utf-8")
    return changes, preview


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only-flagged", action="store_true",
                   help="only show files with strict-YAML hazards")
    p.add_argument("--json", action="store_true")
    p.add_argument("--papers-only", action="store_true",
                   help="restrict scan to paper/<…>/PAPER.md")
    p.add_argument("--no-techniques", action="store_true",
                   help="skip technique/<…>/TECHNIQUE.md")
    p.add_argument("--no-knowledge", action="store_true",
                   help="skip knowledge/<…>.md")
    p.add_argument("--no-skills", action="store_true",
                   help="skip skills/<…>/SKILL.md")
    p.add_argument("--fix", action="store_true",
                   help="apply quote-wrap to each flagged offender; writes files in place")
    p.add_argument("--dry-run", action="store_true",
                   help="with --fix, preview changes without writing")
    args = p.parse_args()
    if args.dry_run and not args.fix:
        print("--dry-run is only meaningful with --fix; ignoring", file=sys.stderr)
    if args.fix and args.json:
        print("--fix and --json are mutually exclusive; pick one", file=sys.stderr)
        return 2

    rows: list[dict] = []
    # paper/ — file is in <slug>/PAPER.md
    for p_ in sorted(PAPER_DIR.glob("**/PAPER.md")):
        slug = p_.relative_to(PAPER_DIR).parent.as_posix()
        rows.append(check_file(p_, "paper", slug))
    if not args.papers_only:
        # technique/ — file is in <slug>/TECHNIQUE.md
        if not args.no_techniques and TECHNIQUE_DIR.exists():
            for t_ in sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md")):
                slug = t_.relative_to(TECHNIQUE_DIR).parent.as_posix()
                rows.append(check_file(t_, "technique", slug))
        # knowledge/ — file is <slug>.md (no enclosing dir)
        if not args.no_knowledge and KNOWLEDGE_DIR.exists():
            for k_ in sorted(KNOWLEDGE_DIR.glob("**/*.md")):
                slug = k_.relative_to(KNOWLEDGE_DIR).with_suffix("").as_posix()
                rows.append(check_file(k_, "knowledge", slug))
        # skills/ — file is in <slug>/SKILL.md
        if not args.no_skills and SKILLS_DIR.exists():
            for s_ in sorted(SKILLS_DIR.glob("**/SKILL.md")):
                slug = s_.relative_to(SKILLS_DIR).parent.as_posix()
                rows.append(check_file(s_, "skill", slug))

    flagged = [r for r in rows if not r["compliant"]]
    compliance_pct = (
        100.0 * (len(rows) - len(flagged)) / len(rows) if rows else 0.0
    )

    if args.fix:
        if not flagged:
            print(f"Nothing to fix — {len(rows)} files clean.")
            return 0
        total_changes = 0
        files_touched = 0
        for r in flagged:
            changes, preview = apply_fix(r, dry_run=args.dry_run)
            if changes:
                files_touched += 1
                total_changes += changes
                marker = "DRY-RUN " if args.dry_run else ""
                print(f"{marker}{r['kind']}/{r['slug']}  ({changes} line(s))")
                for line_no, old, new in preview:
                    print(f"  L{line_no}")
                    print(f"    - {old.rstrip()[:120]}")
                    print(f"    + {new.rstrip()[:120]}")
        verb = "would write" if args.dry_run else "wrote"
        print(
            f"\n{verb} {total_changes} line change(s) across {files_touched} file(s)."
        )
        if not args.dry_run:
            # Re-scan to confirm clean.
            re_rows = [check_file(path_from_row(r), r["kind"], r["slug"]) for r in flagged]
            still_flagged = [r for r in re_rows if not r["compliant"]]
            if still_flagged:
                print(
                    f"\n[VERIFY] {len(still_flagged)} file(s) still flagged after fix — "
                    "manual review required (likely a value already starting with a quote, "
                    "or a multi-line scalar the regex did not match).",
                    file=sys.stderr,
                )
                for r in still_flagged:
                    print(f"  ! {r['kind']}/{r['slug']}", file=sys.stderr)
                return 1
            print("[VERIFY] all fixed files now pass strict-YAML scan.")
        return 0

    display_rows = flagged if args.only_flagged else rows

    if args.json:
        print(json.dumps({
            "summary": {
                "audited": len(rows),
                "compliant": len(rows) - len(flagged),
                "flagged": len(flagged),
                "compliance_pct": round(compliance_pct, 1),
            },
            "rows": display_rows,
        }, indent=2, ensure_ascii=False))
        return 0

    if not display_rows:
        print("No files in scope.")
        return 0

    for r in display_rows:
        marker = "  ! " if not r["compliant"] else "    "
        oc = len(r["offenders"])
        print(f"{marker}{r['kind']:<10} offenders={oc:<2} {r['slug']}")
        for o in r["offenders"]:
            print(f"        L{o['line']:<4} {o['key']:<20s} → {o['snippet']}")

    print(
        "\nStrict-YAML audit (mid-string ': ' in unquoted plain scalars):\n"
        f"  audited:    {len(rows)} file(s)\n"
        f"  compliant:  {len(rows) - len(flagged)}/{len(rows)}\n"
        f"  flagged:    {len(flagged)}\n"
        f"  compliance: {compliance_pct:.1f}%"
    )
    if flagged:
        print(
            "\nRemediation: replace mid-string ': ' with em-dash (—), semicolon, "
            "or wrap the entire value in quotes. PyYAML accepts the unquoted form, "
            "but GitHub's web YAML renderer and Ruby Psych reject it as a "
            "malformed mapping."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
