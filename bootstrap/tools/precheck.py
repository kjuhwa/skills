"""출판 직전 검증 파이프라인.

다음을 순차 실행하고, 하나라도 실패하면 즉시 비정상 종료한다.

    1. _lint_frontmatter.py   — 모든 MD가 필수 스키마를 만족하는지 검증
    2. _build_master_index.py — L1 마스터 인덱스 재생성
    3. _build_category_indexes.py — L2 카테고리별 인덱스 재생성

사용법:
    py precheck.py              # 세 단계 모두 실행
    py precheck.py --strict     # 린터에 --strict 전달
    py precheck.py --skip-lint  # 린트 건너뛰고 인덱스만 갱신

종료 코드:
    0 — 모든 단계 PASS
    ≥1 — 첫 실패한 단계의 exit code
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent


def run(label: str, cmd: list[str]) -> int:
    print(f"\n=== [{label}] {' '.join(cmd)} ===")
    start = time.time()
    res = subprocess.run(cmd, cwd=ROOT)
    dur = time.time() - start
    status = "PASS" if res.returncode == 0 else f"FAIL ({res.returncode})"
    print(f"--- [{label}] {status}  ({dur:.2f}s)")
    return res.returncode


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="린터에 --strict 전달")
    ap.add_argument("--skip-lint", action="store_true")
    args = ap.parse_args()

    py = sys.executable or "py"

    steps: list[tuple[str, list[str]]] = []
    if not args.skip_lint:
        lint_cmd = [py, "_lint_frontmatter.py"]
        if args.strict:
            lint_cmd.append("--strict")
        steps.append(("lint", lint_cmd))
    steps.append(("master-index", [py, "_build_master_index.py"]))
    steps.append(("master-index-lite", [py, "_build_master_index_lite.py"]))
    steps.append(("category-indexes", [py, "_build_category_indexes.py"]))
    steps.append(("citations-index", [py, "_build_citations_index.py"]))
    # Citation graph mermaid is a derived artifact of citations.json
    steps.append(("citation-graph-mermaid", [py, "_build_citation_graph_mermaid.py"]))
    # Audits run after citations are fresh; they read citations.json. Pre-existing
    # paper/orphan health is informational only — do not abort precheck on their output.
    steps.append(("orphan-audit", [py, "_audit_orphan_atoms.py"]))
    steps.append(("paper-loops-audit", [py, "_audit_paper_loops.py"]))
    steps.append(("paper-falsifiability-audit", [py, "_audit_paper_falsifiability.py"]))
    steps.append(("paper-imrad-audit", [py, "_audit_paper_imrad.py"]))
    steps.append(("paper-v03-audit", [py, "_audit_paper_v03.py"]))
    steps.append(("technique-suggestions", [py, "_suggest_techniques.py"]))

    for label, cmd in steps:
        rc = run(label, cmd)
        if rc != 0:
            print(f"\n[ABORT] '{label}' 실패. 이후 단계를 건너뜁니다.")
            return rc

    print("\n[ALL PASS] 출판 가능 상태.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
