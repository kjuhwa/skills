#!/usr/bin/env python3
"""§16 frontmatter brevity convention audit for paper/<…>/PAPER.md.

The §16 amendment (docs/rfc/paper-schema-draft.md, merged 2026-04-26) defines
a soft convention that frontmatter string values stay short (≤200 chars,
with tighter caps on short-label fields). Long-form prose belongs in the
body (IMRaD ## Methods / ## Results / ## Discussion).

This audit walks all PAPER.md frontmatters, scores each string field against
the cap table, and reports per-paper offenders plus the corpus-wide
compliance percentage. The §16.6 self-corrective gate fires if compliance
stays below 60 % past 90 days from the amendment merge — this audit produces
the signal.

Output is informational; exit code 0 even with offenders, matching
_audit_paper_imrad.py / _audit_paper_v03.py / _audit_paper_falsifiability.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

# Force UTF-8 output so ⚠ / em-dash / ≤ in hints don't crash on cp949 / cp1252
# default consoles. Same posture as _audit_paper_v03.py.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"

# §16.2 cap table — string-length limit by frontmatter path pattern.
# Path syntax: list indices stripped to '[*]' so the cap applies to every
# element. The default cap (DEFAULT_CAP) covers any field not in the table.
DEFAULT_CAP = 200
CAPS: dict[str, int] = {
    "description": 120,                                  # v0.1 rule 5
    "premise.if": 200,
    "premise.then": 200,
    "examines[*].role": 80,
    "examines[*].note": 80,
    "perspectives[*].summary": 200,
    "proposed_builds[*].summary": 200,
    "proposed_builds[*].requires[*].role": 80,
    "proposed_builds[*].requires[*].note": 80,
    "experiments[*].method": 200,
    "experiments[*].result": 200,
    "experiments[*].hypothesis": 200,
    "experiments[*].measured[*].condition": 120,
    "outcomes[*].note": 200,
    "verdict.one_line": 200,
    "verdict.rule.when": 200,
    "verdict.rule.do": 200,
    "verdict.rule.threshold": 200,
    "verdict.belief_revision.before_reading": 200,
    "verdict.belief_revision.after_reading": 200,
    "applicability.applies_when[*]": 120,
    "applicability.does_not_apply_when[*]": 120,
    "applicability.invalidated_if_observed[*]": 120,
    "applicability.decay.half_life": 120,
    "applicability.decay.why": 200,
    "premise_history[*].if": 200,
    "premise_history[*].then": 200,
    "premise_history[*].cause": 200,
}

# §16.6 self-corrective gate
AMENDMENT_MERGE_DATE = "2026-04-26"
COMPLIANCE_RETRACTION_THRESHOLD_PCT = 60.0


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


def cap_for(path: str) -> int:
    """Return the cap for the given normalized path. Falls back to DEFAULT_CAP."""
    return CAPS.get(path, DEFAULT_CAP)


def walk_strings(obj, path_parts: list[str], offenders: list[dict]) -> None:
    """Recursively visit every string leaf in obj; record those exceeding the cap."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            walk_strings(v, path_parts + [str(k)], offenders)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            walk_strings(item, path_parts + [f"[{i}]"], offenders)
    elif isinstance(obj, str):
        # Build normalized path with list indices flattened to [*] for cap lookup
        normalized: list[str] = []
        for p in path_parts:
            if p.startswith("[") and p.endswith("]"):
                normalized.append("[*]")
            else:
                if normalized and normalized[-1].endswith("[*]"):
                    normalized[-1] = normalized[-1] + "." + p
                else:
                    normalized.append(p)
        # Re-join with dots, accounting for list-index runs
        norm_path = ""
        for i, p in enumerate(normalized):
            if i == 0:
                norm_path = p
            elif p.startswith("[*]"):
                norm_path += p
            else:
                norm_path += "." + p
        cap = cap_for(norm_path)
        length = len(obj)
        if length > cap:
            # Display path uses real indices for human readability
            display = ".".join(path_parts).replace(".[", "[")
            offenders.append({
                "path": display,
                "cap_path": norm_path,
                "length": length,
                "cap": cap,
                "over_by": length - cap,
            })


def check_paper(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, _body = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    offenders: list[dict] = []
    walk_strings(fm, [], offenders)
    offenders.sort(key=lambda o: -o["length"])
    return {
        "slug": path.relative_to(PAPER_DIR).parent.as_posix(),
        "type": (fm.get("type") or "hypothesis").strip() if isinstance(fm.get("type"), str) else "hypothesis",
        "status": (fm.get("status") or "").strip() if isinstance(fm.get("status"), str) else "",
        "offenders": offenders,
        "compliant": not offenders,
        "max_length": offenders[0]["length"] if offenders else 0,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only-flagged", action="store_true", help="only show non-compliant papers")
    p.add_argument("--json", action="store_true")
    p.add_argument("--top", type=int, default=5,
                   help="show top N offenders per paper (default 5)")
    args = p.parse_args()

    rows = [check_paper(p_) for p_ in sorted(PAPER_DIR.glob("**/PAPER.md"))]
    flagged = [r for r in rows if not r["compliant"]]
    compliance_pct = (
        100.0 * (len(rows) - len(flagged)) / len(rows) if rows else 0.0
    )

    display_rows = flagged if args.only_flagged else rows

    if args.json:
        # Top N per paper to keep payload tractable
        for r in display_rows:
            r["offenders"] = r["offenders"][: args.top]
        print(json.dumps({
            "summary": {
                "audited": len(rows),
                "compliant": len(rows) - len(flagged),
                "flagged": len(flagged),
                "compliance_pct": round(compliance_pct, 1),
                "amendment_merge_date": AMENDMENT_MERGE_DATE,
                "retraction_threshold_pct": COMPLIANCE_RETRACTION_THRESHOLD_PCT,
            },
            "rows": display_rows,
        }, indent=2, ensure_ascii=False))
        return 0

    if not display_rows:
        print("No papers in scope.")
        return 0

    for r in display_rows:
        marker = "  ! " if not r["compliant"] else "    "
        oc = len(r["offenders"])
        print(f"{marker}{r['type']:<10} status={r['status']:<12} offenders={oc:<3} max={r['max_length']:<5} {r['slug']}")
        for o in r["offenders"][: args.top]:
            print(f"        {o['path']:<60s} {o['length']:>5} chars (cap {o['cap']}, over by {o['over_by']})")
        if oc > args.top:
            print(f"        ... and {oc - args.top} more (use --top {oc} to see all)")

    print(
        "\n§16 frontmatter brevity audit (docs/rfc/paper-schema-draft.md §16):\n"
        f"  audited:        {len(rows)} paper(s)\n"
        f"  compliant:      {len(rows) - len(flagged)}/{len(rows)}\n"
        f"  flagged:        {len(flagged)}\n"
        f"  compliance:     {compliance_pct:.1f}%"
    )
    if rows and compliance_pct < COMPLIANCE_RETRACTION_THRESHOLD_PCT:
        print(
            f"  [§16.6] compliance < {COMPLIANCE_RETRACTION_THRESHOLD_PCT:.0f}% — if this persists "
            f"past 90 days from {AMENDMENT_MERGE_DATE}, the §16 convention is a "
            "candidate for retraction or hardening per the self-corrective gate."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
