#!/usr/bin/env python3
"""v0.3 amendment compliance audit for paper/<…>/PAPER.md.

The v0.3 amendment (docs/rfc/paper-schema-draft.md §15) introduces optional
frontmatter fields that make a paper's verdict, decision rule, and
applicability machine-extractable for pre-implementation injection. This audit
reports per-paper compliance and v0.3 field adoption rate.

§15.2 required fields (rules 16-18) — fire only on type=hypothesis AND
status=implemented:
    16. verdict.one_line non-empty
    17. verdict.rule.do non-empty
    18. applicability.applies_when length >= 1

§15.2 advisory WARNs (informational across all statuses):
    a. verdict.rule.threshold empty when status=implemented and any completed
       experiment.result contains numeric tokens.
    b. premise_history[] empty when any completed experiment.supports_premise
       == "partial".
    c. applicability.does_not_apply_when empty when any completed
       experiment.supports_premise is "no" or "partial".
    d. verdict.belief_revision.before_reading empty when premise_history length
       >= 2.

§15.6 adoption signal: percentage of in-scope papers with at least one v0.3
field populated. If this stays below 30 % across implemented hypothesis papers
past 90 days from 2026-04-26 (amendment merge date), the amendment is a
candidate for retraction per the self-corrective gate.

Output is informational; exit code 0 even with non-compliant papers, matching
_audit_paper_imrad.py and _audit_paper_falsifiability.py.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

# Force UTF-8 output so non-ASCII characters in findings/hints don't crash on
# Windows consoles defaulting to cp949 / cp1252. Same posture as other audits
# emitting Unicode (≥, em-dash, etc.).
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"

# Loose signal — any digit sequence in a result string suggests a measurable
# value the threshold field could have captured.
NUMERIC_TOKEN_RE = re.compile(r"\d")

# Schema constants
AMENDMENT_MERGE_DATE = "2026-04-26"
ADOPTION_RETRACTION_THRESHOLD_PCT = 30.0


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


def has_value(obj, *path) -> bool:
    """Return True if every key on path resolves to a non-empty value.

    Treats None, empty string (after strip), empty list, and empty dict as
    "missing." This matches the §15.2 "non-empty" semantics.
    """
    cur = obj
    for k in path:
        if not isinstance(cur, dict):
            return False
        cur = cur.get(k)
    if cur is None:
        return False
    if isinstance(cur, str) and not cur.strip():
        return False
    if isinstance(cur, (list, dict)) and len(cur) == 0:
        return False
    return True


def in_scope_for_required(fm: dict) -> bool:
    """v0.3 §15.2 required rules fire only on hypothesis papers in implemented status."""
    paper_type = (fm.get("type") or "hypothesis").strip()
    status = (fm.get("status") or "").strip()
    return paper_type == "hypothesis" and status == "implemented"


def collect_v03_fields_populated(fm: dict) -> list[str]:
    """Return the list of v0.3 fields that have non-empty values on this paper."""
    fields: list[str] = []
    if has_value(fm, "verdict", "one_line"):
        fields.append("verdict.one_line")
    if has_value(fm, "verdict", "rule", "do"):
        fields.append("verdict.rule.do")
    if has_value(fm, "verdict", "rule", "threshold"):
        fields.append("verdict.rule.threshold")
    if has_value(fm, "verdict", "belief_revision", "before_reading"):
        fields.append("verdict.belief_revision.before_reading")
    if has_value(fm, "verdict", "belief_revision", "after_reading"):
        fields.append("verdict.belief_revision.after_reading")
    if has_value(fm, "applicability", "applies_when"):
        fields.append("applicability.applies_when")
    if has_value(fm, "applicability", "does_not_apply_when"):
        fields.append("applicability.does_not_apply_when")
    if has_value(fm, "applicability", "invalidated_if_observed"):
        fields.append("applicability.invalidated_if_observed")
    if has_value(fm, "applicability", "decay", "half_life"):
        fields.append("applicability.decay.half_life")
    if has_value(fm, "premise_history"):
        fields.append("premise_history")
    experiments = fm.get("experiments") or []
    if any(isinstance(e, dict) and e.get("measured") for e in experiments):
        fields.append("experiments[].measured")
    if any(isinstance(e, dict) and e.get("refutes") for e in experiments):
        fields.append("experiments[].refutes")
    if any(isinstance(e, dict) and e.get("confirms") for e in experiments):
        fields.append("experiments[].confirms")
    return fields


def check_paper(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, _body = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    paper_type = (fm.get("type") or "hypothesis").strip()
    status = (fm.get("status") or "").strip()

    required_findings: list[dict] = []
    advisory_findings: list[dict] = []
    in_scope = in_scope_for_required(fm)

    if in_scope:
        if not has_value(fm, "verdict", "one_line"):
            required_findings.append({"rule": 16, "field": "verdict.one_line"})
        if not has_value(fm, "verdict", "rule", "do"):
            required_findings.append({"rule": 17, "field": "verdict.rule.do"})
        if not has_value(fm, "applicability", "applies_when"):
            required_findings.append({"rule": 18, "field": "applicability.applies_when"})

    experiments = fm.get("experiments") or []
    if not isinstance(experiments, list):
        experiments = []
    completed = [e for e in experiments if isinstance(e, dict) and e.get("status") == "completed"]

    # WARN a: numeric result without threshold (only when implemented — verdict
    # is populated at implemented per §15.1)
    if status == "implemented" and not has_value(fm, "verdict", "rule", "threshold"):
        for e in completed:
            result = str(e.get("result") or "")
            if NUMERIC_TOKEN_RE.search(result):
                advisory_findings.append({
                    "rule": "a",
                    "field": "verdict.rule.threshold",
                    "hint": (
                        f"experiment '{e.get('name')}' result contains numeric tokens; "
                        "consider extracting threshold"
                    ),
                })
                break

    # WARN b: partial verdict without rewrite log
    if any(e.get("supports_premise") == "partial" for e in completed) and not has_value(fm, "premise_history"):
        advisory_findings.append({
            "rule": "b",
            "field": "premise_history",
            "hint": (
                "experiment.supports_premise is partial; partial verdicts almost always imply "
                "a premise rewrite — capture it in premise_history[]"
            ),
        })

    # WARN c: no/partial verdict without does_not_apply_when
    if any(e.get("supports_premise") in {"no", "partial"} for e in completed) and not has_value(fm, "applicability", "does_not_apply_when"):
        advisory_findings.append({
            "rule": "c",
            "field": "applicability.does_not_apply_when",
            "hint": (
                "supports_premise=no/partial cells ARE the does-not-apply conditions; "
                "surface them in applicability.does_not_apply_when"
            ),
        })

    # WARN d: rewrites without before_reading
    history = fm.get("premise_history") or []
    if isinstance(history, list) and len(history) >= 2 and not has_value(fm, "verdict", "belief_revision", "before_reading"):
        advisory_findings.append({
            "rule": "d",
            "field": "verdict.belief_revision.before_reading",
            "hint": (
                ">=2 premise revisions but before_reading is empty — the original assumption "
                "that drove revision 1 should be captured"
            ),
        })

    populated = collect_v03_fields_populated(fm)

    return {
        "slug": path.relative_to(PAPER_DIR).parent.as_posix(),
        "type": paper_type,
        "status": status,
        "in_scope_for_required": in_scope,
        "required_findings": required_findings,
        "advisory_findings": advisory_findings,
        "v03_fields_populated": populated,
        "compliant": not required_findings,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only-flagged", action="store_true", help="only show papers with required-rule failures")
    p.add_argument("--only-advisory", action="store_true", help="only show papers with advisory WARNs")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    rows = [check_paper(p_) for p_ in sorted(PAPER_DIR.glob("**/PAPER.md"))]
    flagged_required = [r for r in rows if r["required_findings"]]
    flagged_advisory = [r for r in rows if r["advisory_findings"]]
    in_scope = [r for r in rows if r["in_scope_for_required"]]
    adopted = [r for r in in_scope if r["v03_fields_populated"]]
    adoption_pct = (100.0 * len(adopted) / len(in_scope)) if in_scope else 0.0

    display_rows = rows
    if args.only_flagged:
        display_rows = flagged_required
    elif args.only_advisory:
        display_rows = flagged_advisory

    if args.json:
        print(json.dumps({
            "summary": {
                "audited": len(rows),
                "in_scope_for_required": len(in_scope),
                "required_compliant": len(in_scope) - len(flagged_required),
                "required_flagged": len(flagged_required),
                "advisory_flagged": len(flagged_advisory),
                "adoption_pct_implemented_hypothesis": round(adoption_pct, 1),
                "amendment_merge_date": AMENDMENT_MERGE_DATE,
                "retraction_threshold_pct": ADOPTION_RETRACTION_THRESHOLD_PCT,
            },
            "rows": display_rows,
        }, indent=2, ensure_ascii=False))
        return 0

    if not display_rows:
        print("No papers in scope.")
        return 0

    for r in display_rows:
        if r["required_findings"]:
            marker = "  ! "
        elif r["advisory_findings"]:
            marker = "  ~ "
        else:
            marker = "    "
        v03_count = len(r["v03_fields_populated"])
        print(f"{marker}{r['type']:<10} status={r['status']:<12} v03={v03_count:<2} {r['slug']}")
        for f in r["required_findings"]:
            print(f"        REQUIRED rule {f['rule']}: {f['field']} missing")
        for f in r["advisory_findings"]:
            print(f"        advisory  rule {f['rule']}: {f['field']} — {f['hint']}")

    print(
        "\nv0.3 amendment audit (docs/rfc/paper-schema-draft.md §15):\n"
        f"  audited:                                       {len(rows)} paper(s)\n"
        f"  in scope for required rules (hyp+implemented): {len(in_scope)}\n"
        f"  required-rule compliant:                       {len(in_scope) - len(flagged_required)}/{len(in_scope) if in_scope else 0}\n"
        f"  required-rule flagged:                         {len(flagged_required)}\n"
        f"  advisory WARNs:                                {len(flagged_advisory)}\n"
        f"  v0.3 field adoption:                           {adoption_pct:.1f}% ({len(adopted)}/{len(in_scope)} implemented hypothesis papers)"
    )
    if in_scope and adoption_pct < ADOPTION_RETRACTION_THRESHOLD_PCT:
        print(
            f"  [§15.6] adoption < {ADOPTION_RETRACTION_THRESHOLD_PCT:.0f}% — if this persists past "
            f"90 days from {AMENDMENT_MERGE_DATE}, the v0.3 amendment is a candidate "
            "for retraction per the self-corrective gate."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
