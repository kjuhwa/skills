#!/usr/bin/env python3
"""Find atom bundles that recur across techniques and paper proposed_builds.

When the same set of skills/knowledge is referenced together in multiple parent entries
(a technique's composes[] OR a paper's proposed_builds[].requires[]), that bundle is a
candidate for being formalized as a *new* technique. The current corpus has 17 techniques;
this tool surfaces patterns hiding inside the citation graph that haven't been named yet.

Why this matters
----------------
The technique layer's value comes from having canonical names for recurring compositions.
A skill bundle that appears in 3+ parent entries but is not itself a technique is leaving
that value unrealized — every author re-discovers the bundle from scratch.

How
---
1. Walk every technique's composes[] → collect (parent, atom_set)
2. Walk every paper's proposed_builds[].requires[] → collect (parent, atom_set)
3. For each pair (a, b) of atoms, count parents containing both
4. Pairs with count ≥ 2 are co-occurrence candidates
5. Connected components in the co-occurrence graph become candidate bundles
6. For each candidate bundle: report the parents containing ≥2 of its atoms,
   so the human can judge whether the pattern is real or coincidental

This is heuristic — bundles are *suggestions*, not refactor commands. False positives
include "common dependencies" (every workflow technique uses parallel-build-sequential-publish)
and false negatives include "patterns expressible only in prose, not by atom set".
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

import yaml

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"
TECHNIQUE_DIR = HUB_ROOT / "technique"


def split_frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return ""
    end = text.find("\n---\n", 4)
    if end == -1:
        return ""
    return text[4 : end + 1]


def parse_frontmatter(path: Path) -> dict:
    fm = split_frontmatter(path.read_text(encoding="utf-8"))
    if not fm:
        return {}
    try:
        return yaml.safe_load(fm) or {}
    except yaml.YAMLError:
        return {}


def atom_key(entry: dict) -> str | None:
    kind = (entry.get("kind") or "").strip()
    ref = (entry.get("ref") or "").strip()
    if not kind or not ref:
        return None
    if kind not in ("skill", "knowledge"):
        return None
    return f"{kind}/{ref}"


def gather_parents() -> list[tuple[str, str, frozenset[str]]]:
    """Return [(parent_kind, parent_ref, frozenset_of_atom_keys)]."""
    out: list[tuple[str, str, frozenset[str]]] = []

    # Techniques
    for tech_md in sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md")):
        fm = parse_frontmatter(tech_md)
        ref = tech_md.relative_to(TECHNIQUE_DIR).parent.as_posix()
        atoms = set()
        for entry in fm.get("composes") or []:
            if isinstance(entry, dict):
                k = atom_key(entry)
                if k:
                    atoms.add(k)
        if atoms:
            out.append(("technique", ref, frozenset(atoms)))

    # Paper proposed_builds.requires
    for paper_md in sorted(PAPER_DIR.glob("**/PAPER.md")):
        fm = parse_frontmatter(paper_md)
        paper_ref = paper_md.relative_to(PAPER_DIR).parent.as_posix()
        for build in fm.get("proposed_builds") or []:
            if not isinstance(build, dict):
                continue
            slug = (build.get("slug") or "").strip()
            atoms = set()
            for entry in build.get("requires") or []:
                if isinstance(entry, dict):
                    k = atom_key(entry)
                    if k:
                        atoms.add(k)
            if atoms:
                out.append(("build", f"{paper_ref}/{slug}", frozenset(atoms)))

    return out


def pair_counts(parents: list[tuple[str, str, frozenset[str]]]) -> Counter:
    counts: Counter = Counter()
    for _, _, atoms in parents:
        for pair in combinations(sorted(atoms), 2):
            counts[pair] += 1
    return counts


def cluster_by_pairs(frequent_pairs: list[tuple[tuple[str, str], int]]) -> list[set[str]]:
    """Connected components in the co-occurrence graph."""
    adjacency: dict[str, set[str]] = defaultdict(set)
    for (a, b), _ in frequent_pairs:
        adjacency[a].add(b)
        adjacency[b].add(a)

    visited: set[str] = set()
    components: list[set[str]] = []
    for atom in adjacency:
        if atom in visited:
            continue
        component: set[str] = set()
        stack = [atom]
        while stack:
            n = stack.pop()
            if n in visited:
                continue
            visited.add(n)
            component.add(n)
            stack.extend(adjacency[n])
        if len(component) >= 2:
            components.append(component)
    return components


def parents_containing(parents, bundle: set[str], min_overlap: int) -> list[tuple[str, str, int]]:
    """Return parents that contain ≥ min_overlap atoms from the bundle."""
    out = []
    for kind, ref, atoms in parents:
        overlap = len(atoms & bundle)
        if overlap >= min_overlap:
            out.append((kind, ref, overlap))
    return sorted(out, key=lambda x: (-x[2], x[0], x[1]))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--min-pair-count", type=int, default=2,
                   help="Minimum parents that share a pair to count as co-occurring (default 2)")
    p.add_argument("--min-bundle-overlap", type=int, default=2,
                   help="Min atoms a parent must share with a bundle to be reported (default 2)")
    p.add_argument("--top", type=int, default=10, help="Show top N candidate bundles (default 10)")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    parents = gather_parents()
    if not parents:
        print("No parent entries found.")
        return 0

    pc = pair_counts(parents)
    frequent = [(p_, c) for p_, c in pc.items() if c >= args.min_pair_count]
    frequent.sort(key=lambda x: -x[1])

    bundles = cluster_by_pairs(frequent)
    bundles.sort(key=lambda s: -len(s))
    bundles = bundles[: args.top]

    if args.json:
        out = {
            "parent_count": len(parents),
            "frequent_pairs": [
                {"a": p[0], "b": p[1], "shared_parents": c}
                for p, c in frequent[: args.top * 4]
            ],
            "candidate_bundles": [
                {
                    "atoms": sorted(b),
                    "parents": [
                        {"kind": k, "ref": r, "overlap": o}
                        for k, r, o in parents_containing(parents, b, args.min_bundle_overlap)
                    ],
                }
                for b in bundles
            ],
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0

    print(f"Scanned {len(parents)} parents (techniques + paper proposed_builds).")
    print(f"Frequent atom pairs (shared by ≥{args.min_pair_count} parents): {len(frequent)}")
    if not frequent:
        print("\nNo recurring atom pairs found. The corpus is sparse — try lowering --min-pair-count "
              "or wait for more techniques / proposed_builds.")
        return 0

    print("\nTop frequent pairs:")
    for (a, b), c in frequent[: args.top]:
        print(f"  {c}x  {a}  +  {b}")

    if not bundles:
        print("\nNo bundles formed (all frequent pairs are isolated).")
        return 0

    print(f"\n{len(bundles)} candidate bundle(s) for new techniques:\n")
    for i, bundle in enumerate(bundles, 1):
        print(f"--- Bundle {i} ({len(bundle)} atoms) ---")
        for atom in sorted(bundle):
            print(f"  • {atom}")
        parents_match = parents_containing(parents, bundle, args.min_bundle_overlap)
        if parents_match:
            print(f"  Parents containing ≥{args.min_bundle_overlap} of these atoms:")
            for kind, ref, overlap in parents_match[:8]:
                print(f"    [{kind}] {ref}  ({overlap} of {len(bundle)})")
            if len(parents_match) > 8:
                print(f"    … and {len(parents_match) - 8} more")
        print()

    print("Action: candidates above are *suggestions*. To formalize one as a technique:")
    print("  /hub-technique-compose <slug>   # then pick the bundle's atoms")
    return 0


if __name__ == "__main__":
    sys.exit(main())
