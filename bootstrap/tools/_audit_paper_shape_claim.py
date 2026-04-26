#!/usr/bin/env python3
"""Shape-claim classification audit for paper/<…>/PAPER.md and technique/<…>/TECHNIQUE.md.

Classifies each paper + technique into one of 9 shape-claim buckets per paper
#1188's taxonomy and tracks cross-layer cost-displacement ratio. Surfaces
cluster sizes per shape category to support paper #1205's N=3 saturation rule
when authoring new papers.

Buckets (matches PR template paper.md):
    cost-displacement, threshold-cliff, log-search, hysteresis, convergence,
    necessity, pareto, self-improvement, universality, saturation, other

Classification heuristic (priority order):
    1. tags[] contains explicit shape token
    2. verdict.one_line keyword match (papers only, when present)
    3. premise.then keyword match (papers only)
    4. description keyword match
    5. fall-back: 'other'

Output (informational, exit 0):
    - per-paper / per-technique shape classification
    - corpus-wide distribution (count + %)
    - cross-layer cost-displacement ratio (paper-CD% / technique-CD%)
    - per-shape paper count vs #1205 N=3 saturation marker

Output is informational; exit code 0 even with high cost-displacement ratio,
matching the audit-fleet posture.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

HUB_ROOT = Path(__file__).resolve().parents[2]
PAPER_DIR = HUB_ROOT / "paper"
TECHNIQUE_DIR = HUB_ROOT / "technique"

SHAPE_KEYWORDS = {
    "cost-displacement": [
        "crossover", "cost-displacement", "breakeven", "break-even", "trade-off", "tradeoff",
        "displacement", "ROI", "displaces past", "cost grows but", "overhead-vs-parallelism",
        "vs-parallelism", "checkpoint-overhead", "fallback-cost", "staleness-curve"
    ],
    "threshold-cliff": [
        "threshold-cliff", "cliff", "discontinuous", "discontinuity", "trip threshold",
        "binary state", "sharp transition", "cliff at", "auto-revert", "boundary-conditions",
        "killswitch-with-circuit-state", "scaling-curve"
    ],
    "log-search": [
        "log-search", "log2", "binary-narrowing", "binary search", "bisect",
        "halving", "narrowing", "log(N)"
    ],
    "hysteresis": [
        "hysteresis", "high-water", "low-water", "watermark", "trip/reset gap",
        "gap calibration", "plateau between two cliffs", "flap-prevention"
    ],
    "convergence": [
        "convergence", "iteration converges", "fixed point", "asymptotic decay",
        "diminishing returns", "iter-to-converge", "iteration loop", "flicker-tolerance",
        "flicker tolerance"
    ],
    "necessity": [
        "necessity", "must precede", "ordering", "monotonic", "anchor phase",
        "anchor-phase", "out-of-order", "structurally different", "phase ordering",
        "phase-ordering", "rotation-window-tradeoff", "overlap-window",
        "rate-limit-comparison", "vs-rate-limit"
    ],
    "pareto": [
        "pareto", "long-tail", "long tail", "80/20", "Gini", "power law",
        "power-law", "distribution shape", "top 20%", "composition-value"
    ],
    "self-improvement": [
        "self-improvement", "self-correction", "bias-correction", "bias correction",
        "meta-corpus", "cluster-formation", "corpus dynamics", "feasibility",
        "durability"
    ],
    "universality": [
        "universality", "cross-domain", "shared generator", "common generator",
        "clustering ratio", "alpha clustering"
    ],
    "saturation": [
        "saturation-without-crossover", "saturation", "plateau thereafter",
        "no inversion", "saturates at", "asymptote", "scaling-curve"
    ],
    "structural-only": [
        "fan-out", "fan-in", "isolation", "ladder", "orchestrator", "compose",
        "composition", "pipeline", "saga-with-compensation-chain",
        "idempotent-mutation", "strangler-fig", "monotonic-ratchet",
        "gated-fallback-chain", "leader-election", "multi-peer-quorum",
        "task-graph-router", "circuit-breaker-per-worker", "replay-from-event-log",
        "budget-token-allocation", "priority-queue-preemption",
        "saga-compensation-routing", "deadline-aware-task-pruning",
        "result-streaming-vs-batch", "tier-spillover-cheapest-first",
        "change-stream-resilient", "producer-consumer-backpressure-loop",
        "idempotent-migration-with-resume", "root-cause-to-tdd-plan",
        "canary-rollout-with-auto-revert", "figma-driven-ai-react-design-system",
        "optimistic-mutation-with-server-reconcile", "credential-rotation-overlap",
        "contract-test-with-consumer-verification", "fuzz-crash-to-fix-loop",
        "fan-out-fan-in-with-bulkhead", "safe-bulk-pr-publishing",
        "soft-convention-4pr-cascade", "swagger-spec-ai-agent-hardening",
        "swagger-spec-selective-two-pass-loading",
        "figma-token-tailwind-pipeline", "claude-component-variant",
        "css-token-violation-precommit-gate", "figma-react-pixel-diff",
        "storybook-from-figma", "figma-state-machine",
        "css-specificity-drift", "figma-prop-interface",
        "dark-mode-token-mirror", "a11y-spec-from-figma"
    ],
    "invariant-only": [
        "idempotency", "idempotent", "atomicity", "consistency", "exactly-once",
        "at-least-once", "at-most-once", "rollback path", "compensating action",
        "invariant", "audit trail"
    ],
}


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


def classify_shape(text_blobs: list[str], tags: list[str]) -> str:
    """Pick best-matching shape from priority text-blobs + tags."""
    # Tag priority — explicit shape token in tags[]
    tag_lower = [t.lower() for t in tags if isinstance(t, str)]
    for shape in SHAPE_KEYWORDS:
        if shape in tag_lower or shape.replace("-", "_") in tag_lower:
            return shape
    # Text-blob priority — first matching shape in priority order of blobs
    for blob in text_blobs:
        if not blob:
            continue
        blob_lower = blob.lower()
        # Score each shape by total keyword hits in this blob
        scores = {}
        for shape, kws in SHAPE_KEYWORDS.items():
            score = sum(1 for kw in kws if kw.lower() in blob_lower)
            if score > 0:
                scores[shape] = score
        if scores:
            # Highest-scoring shape wins ties to first registered
            return max(scores.items(), key=lambda kv: kv[1])[0]
    return "other"


def extract_paper_blobs(fm: dict) -> list[str]:
    """Order matters: verdict > premise > description."""
    blobs = []
    verdict = fm.get("verdict") or {}
    if isinstance(verdict, dict):
        ol = verdict.get("one_line") or ""
        blobs.append(str(ol))
    premise = fm.get("premise") or {}
    if isinstance(premise, dict):
        then = premise.get("then") or ""
        blobs.append(str(then))
    blobs.append(str(fm.get("description") or ""))
    return blobs


def extract_technique_blobs(fm: dict) -> list[str]:
    """Order: recipe.one_line > description."""
    blobs = []
    recipe = fm.get("recipe") or {}
    if isinstance(recipe, dict):
        ol = recipe.get("one_line") or ""
        blobs.append(str(ol))
    blobs.append(str(fm.get("description") or ""))
    return blobs


def check_paper(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, _ = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    tags = fm.get("tags") or []
    slug = path.relative_to(PAPER_DIR).parent.as_posix()
    blobs = extract_paper_blobs(fm) + [slug]  # slug as last-resort signal
    shape = classify_shape(blobs, tags)
    return {
        "kind": "paper",
        "slug": slug,
        "type": fm.get("type", "unknown"),
        "status": fm.get("status", "unknown"),
        "shape": shape,
    }


def check_technique(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_text, _ = split_frontmatter(text)
    fm = parse_frontmatter(fm_text)
    tags = fm.get("tags") or []
    slug = path.relative_to(TECHNIQUE_DIR).parent.as_posix()
    blobs = extract_technique_blobs(fm) + [slug]  # slug as last-resort signal
    shape = classify_shape(blobs, tags)
    return {
        "kind": "technique",
        "slug": slug,
        "shape": shape,
    }


def render(rows: list[dict], json_out: bool) -> int:
    paper_rows = [r for r in rows if r["kind"] == "paper"]
    tech_rows = [r for r in rows if r["kind"] == "technique"]

    paper_dist = {}
    for r in paper_rows:
        paper_dist[r["shape"]] = paper_dist.get(r["shape"], 0) + 1
    tech_dist = {}
    for r in tech_rows:
        tech_dist[r["shape"]] = tech_dist.get(r["shape"], 0) + 1

    n_papers = len(paper_rows) or 1
    n_techs = len(tech_rows) or 1

    paper_cd = paper_dist.get("cost-displacement", 0)
    tech_cd = tech_dist.get("cost-displacement", 0)
    ratio_paper = paper_cd / n_papers
    ratio_tech = tech_cd / n_techs
    ratio_gap = (ratio_paper / ratio_tech) if ratio_tech else float("inf")

    if json_out:
        print(json.dumps({
            "rows": rows,
            "paper_distribution": paper_dist,
            "technique_distribution": tech_dist,
            "paper_cd_ratio": ratio_paper,
            "technique_cd_ratio": ratio_tech,
            "cross_layer_ratio_gap": ratio_gap,
        }, indent=2))
        return 0

    print()
    print("Paper-layer shape distribution:")
    for shape in list(SHAPE_KEYWORDS.keys()) + ["other"]:
        cnt = paper_dist.get(shape, 0)
        if cnt:
            pct = 100.0 * cnt / n_papers
            cluster = "stable" if cnt >= 3 else ("forming" if cnt == 2 else "single")
            print(f"  {shape:25s} {cnt:3d}/{n_papers}  ({pct:4.1f}%)  [{cluster}]")
    print()
    print("Technique-layer shape distribution:")
    for shape in list(SHAPE_KEYWORDS.keys()) + ["other"]:
        cnt = tech_dist.get(shape, 0)
        if cnt:
            pct = 100.0 * cnt / n_techs
            print(f"  {shape:25s} {cnt:3d}/{n_techs}  ({pct:4.1f}%)")
    print()
    print(f"Cross-layer cost-displacement ratio (per #1188 verdict tracking):")
    print(f"  paper layer:     {paper_cd}/{n_papers} ({ratio_paper*100:4.1f}%)")
    print(f"  technique layer: {tech_cd}/{n_techs} ({ratio_tech*100:4.1f}%)")
    print(f"  ratio gap:       {ratio_gap:.2f}x  (target: ≤2.0x per #1188)")
    print()
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--json", action="store_true",
                   help="emit machine-readable JSON")
    p.add_argument("--only-papers", action="store_true",
                   help="audit papers only, skip techniques")
    args = p.parse_args()

    rows = []
    for path in sorted(PAPER_DIR.glob("**/PAPER.md")):
        rows.append(check_paper(path))
    if not args.only_papers:
        for path in sorted(TECHNIQUE_DIR.glob("**/TECHNIQUE.md")):
            rows.append(check_technique(path))

    return render(rows, args.json)


if __name__ == "__main__":
    sys.exit(main())
