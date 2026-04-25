#!/usr/bin/env python3
"""v0.2 amendment compliance audit for technique/<…>/TECHNIQUE.md.

The §13 amendment (docs/rfc/technique-schema-draft.md, merged in PR #1144)
introduces optional `recipe.*` frontmatter fields that make a technique's
decision-time signal machine-extractable for LLM pre-implementation injection.
This audit reports per-technique compliance and corpus-wide adoption rate.

§13.2 required fields (rules R1-R3) — fire only when the `recipe:` block is
present:
    R1. recipe.one_line non-empty
    R2. recipe.preconditions length >= 1
    R3. recipe.anti_conditions length >= 1

§13.2 advisory WARNs (informational, never FAIL on their own):
    A1. recipe.failure_modes empty when any composes[].ref starts with
        "pitfall/" — the technique cites a pitfall but doesn't tell the
        caller what failure to watch for.
    A2. recipe.assembly_order empty when composes[].length >= 3 — likely a
        pipeline whose order matters; surface it.
    A3. recipe.failure_modes[i].atom_ref does not match any composes[].ref —
        signal tagged to an atom not in the recipe (likely typo).

§13.6 adoption signal: percentage of techniques with non-empty
recipe.one_line. If this stays below 30 % across the corpus past 90 days
from 2026-04-26 (amendment merge date), v0.2 fields are a candidate for
retraction per the self-corrective gate.

Output is informational; exit code 0 even with non-compliant techniques,
matching _audit_paper_v03.py / _audit_paper_imrad.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

# Force UTF-8 output so non-ASCII characters in findings/hints don't crash on
# Windows consoles defaulting to cp949 / cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

HUB_ROOT = Path(__file__).resolve().parents[2]
TECHNIQUE_DIR = HUB_ROOT / "technique"

# Schema constants (§13.6)
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
    "missing." Matches §13.2 "non-empty" semantics.
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


def has_recipe_block(fm: dict) -> bool:
    """Return True if the technique opted into v0.2 (any recipe.* sub-key populated)."""
    recipe = fm.get("recipe")
    if not isinstance(recipe, dict):
        return False
    return any(recipe.get(k) for k in ("one_line", "preconditions", "anti_conditions",
                                        "failure_modes", "assembly_order"))


def collect_v02_fields_populated(fm: dict) -> list[str]:
    """Return the list of v0.2 fields that have non-empty values on this technique."""
    fields: list[str] = []
    if has_value(fm, "recipe", "one_line"):
        fields.append("recipe.one_line")
    if has_value(fm, "recipe", "preconditions"):
        fields.append("recipe.preconditions")
    if has_value(fm, "recipe", "anti_conditions"):
        fields.append("recipe.anti_conditions")
    if has_value(fm, "recipe", "failure_modes"):
        fields.append("recipe.failure_modes")
    if has_value(fm, "recipe", "assembly_order"):
        fields.append("recipe.assembly_order")
    return fields


def collect_composes_refs(fm: dict) -> list[str]:
    """Return list of "<kind>/<ref>" strings from composes[] for cross-checking."""
    composes = fm.get("composes") or []
    if not isinstance(composes, list):
        return []
    refs: list[str] = []
    for c in composes:
        if not isinstance(c, dict):
            continue
        kind = c.get("kind") or ""
        ref = c.get("ref") or ""
        if kind and ref:
            refs.append(f"{kind}:{ref}")
    return refs


def composes_includes_pitfall(fm: dict) -> bool:
    """Return True if any composes[].ref starts with 'pitfall/'."""
    composes = fm.get("composes") or []
    if not isinstance(composes, list):
        return False
    for c in composes:
        if isinstance(c, dict) and isinstance(c.get("ref"), str) and c["ref"].startswith("pitfall/"):
            return True
    return False


def composes_count(fm: dict) -> int:
    composes = fm.get("composes") or []
    return len(composes) if isinstance(composes, list) else 0


def check_technique(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, _body = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    has_recipe = has_recipe_block(fm)

    required_findings: list[dict] = []
    advisory_findings: list[dict] = []

    # Required rules (R1-R3) fire ONLY when the recipe: block is present per §13.2.
    if has_recipe:
        if not has_value(fm, "recipe", "one_line"):
            required_findings.append({"rule": "R1", "field": "recipe.one_line"})
        if not has_value(fm, "recipe", "preconditions"):
            required_findings.append({"rule": "R2", "field": "recipe.preconditions"})
        if not has_value(fm, "recipe", "anti_conditions"):
            required_findings.append({"rule": "R3", "field": "recipe.anti_conditions"})

    # Advisory WARNs (A1-A3) — fire across all techniques to surface authoring gaps.
    # A1: failure_modes missing when a pitfall is composed
    if composes_includes_pitfall(fm) and not has_value(fm, "recipe", "failure_modes"):
        advisory_findings.append({
            "rule": "A1",
            "field": "recipe.failure_modes",
            "hint": (
                "technique composes a pitfall/ knowledge atom but does not "
                "expose what failure signal the caller should watch for"
            ),
        })

    # A2: assembly_order missing on multi-atom techniques
    n_composes = composes_count(fm)
    if n_composes >= 3 and not has_value(fm, "recipe", "assembly_order"):
        advisory_findings.append({
            "rule": "A2",
            "field": "recipe.assembly_order",
            "hint": (
                f"technique composes {n_composes} atoms; order likely matters — "
                "surface it via assembly_order[]"
            ),
        })

    # A3: failure_modes[i].atom_ref does not match any composes[].ref
    failure_modes = fm.get("recipe", {}).get("failure_modes") if isinstance(fm.get("recipe"), dict) else None
    if isinstance(failure_modes, list) and failure_modes:
        composes_refs = collect_composes_refs(fm)
        for i, fm_entry in enumerate(failure_modes):
            if not isinstance(fm_entry, dict):
                continue
            atom_ref = (fm_entry.get("atom_ref") or "").strip()
            if not atom_ref:
                continue
            if atom_ref not in composes_refs:
                advisory_findings.append({
                    "rule": "A3",
                    "field": f"recipe.failure_modes[{i}].atom_ref",
                    "hint": (
                        f"atom_ref '{atom_ref}' does not match any composes[].ref "
                        "(likely typo or dead reference)"
                    ),
                })

    populated = collect_v02_fields_populated(fm)

    return {
        "slug": path.relative_to(TECHNIQUE_DIR).parent.as_posix(),
        "category": (fm.get("category") or "").strip() if isinstance(fm.get("category"), str) else "",
        "has_recipe_block": has_recipe,
        "v02_fields_populated": populated,
        "required_findings": required_findings,
        "advisory_findings": advisory_findings,
        "compliant": not required_findings,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only-flagged", action="store_true",
                   help="only show techniques with required-rule failures")
    p.add_argument("--only-advisory", action="store_true",
                   help="only show techniques with advisory WARNs")
    p.add_argument("--only-opted-in", action="store_true",
                   help="only show techniques that opted into v0.2 (have recipe: block)")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    rows = [check_technique(p_) for p_ in sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md"))]
    flagged_required = [r for r in rows if r["required_findings"]]
    flagged_advisory = [r for r in rows if r["advisory_findings"]]
    opted_in = [r for r in rows if r["has_recipe_block"]]
    fully_compliant = [r for r in opted_in if not r["required_findings"]]

    # Adoption % = techniques with recipe.one_line populated / total techniques.
    # Mirrors §13.6 self-corrective gate language.
    adopted = [r for r in rows if "recipe.one_line" in r["v02_fields_populated"]]
    adoption_pct = (100.0 * len(adopted) / len(rows)) if rows else 0.0

    display_rows = rows
    if args.only_flagged:
        display_rows = flagged_required
    elif args.only_advisory:
        display_rows = flagged_advisory
    elif args.only_opted_in:
        display_rows = opted_in

    if args.json:
        print(json.dumps({
            "summary": {
                "audited": len(rows),
                "opted_in": len(opted_in),
                "fully_compliant_when_opted_in": len(fully_compliant),
                "required_flagged": len(flagged_required),
                "advisory_flagged": len(flagged_advisory),
                "adoption_pct_recipe_one_line": round(adoption_pct, 1),
                "amendment_merge_date": AMENDMENT_MERGE_DATE,
                "retraction_threshold_pct": ADOPTION_RETRACTION_THRESHOLD_PCT,
            },
            "rows": display_rows,
        }, indent=2, ensure_ascii=False))
        return 0

    if not display_rows:
        print("No techniques in scope.")
        return 0

    for r in display_rows:
        if r["required_findings"]:
            marker = "  ! "
        elif r["advisory_findings"]:
            marker = "  ~ "
        elif r["has_recipe_block"]:
            marker = "  + "
        else:
            marker = "    "
        v02_count = len(r["v02_fields_populated"])
        opted = "v0.2" if r["has_recipe_block"] else "v0.1"
        print(f"{marker}{opted:<5s} v02={v02_count:<2} {r['category']:<10} {r['slug']}")
        for f in r["required_findings"]:
            print(f"        REQUIRED rule {f['rule']}: {f['field']} missing")
        for f in r["advisory_findings"]:
            print(f"        advisory  rule {f['rule']}: {f['field']} — {f['hint']}")

    print(
        "\nv0.2 amendment audit (docs/rfc/technique-schema-draft.md §13):\n"
        f"  audited:                                       {len(rows)} technique(s)\n"
        f"  opted into v0.2 (recipe: block present):       {len(opted_in)}\n"
        f"  fully compliant (R1-R3 pass when opted in):    {len(fully_compliant)}/{len(opted_in) if opted_in else 0}\n"
        f"  required-rule flagged:                         {len(flagged_required)}\n"
        f"  advisory WARNs:                                {len(flagged_advisory)}\n"
        f"  recipe.one_line adoption:                      {adoption_pct:.1f}% ({len(adopted)}/{len(rows)} techniques)"
    )
    if rows and adoption_pct < ADOPTION_RETRACTION_THRESHOLD_PCT:
        print(
            f"  [§13.6] adoption < {ADOPTION_RETRACTION_THRESHOLD_PCT:.0f}% — if this persists past "
            f"90 days from {AMENDMENT_MERGE_DATE}, the v0.2 amendment is a candidate "
            "for retraction per the self-corrective gate."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
