"""경량 마스터 인덱스 생성기.

전체 748 항목을 다 실은 `00_MASTER_INDEX.md`(310KB)는 토큰 비용이 크다.
이 스크립트는 **카테고리 맵 + 카테고리별 대표 N개**만 담은
`00_MASTER_INDEX_LITE.md`를 생성한다. 평소 AI 세션에는 Lite를 먼저 읽히고,
세부 조회가 필요하면 전체본이나 `hub_search.py`를 호출한다.

품질 점수:
  - description/summary 존재 : +3
  - tags 존재 (>=1)          : +2 (개수 상한 5)
  - version 존재             : +1
  - description 길이 80~220  : +1
  - 이름 토큰 수 3~8         : +1

사용법:
    py _build_master_index_lite.py          # 카테고리당 5개
    py _build_master_index_lite.py --top 10 # 카테고리당 10개
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from collections import defaultdict
from pathlib import Path

HUB_INDEX = Path.home() / ".claude" / "skills-hub" / "remote" / "index.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "indexes" / "00_MASTER_INDEX_LITE.md"


def resolve_category(entry: dict) -> str:
    cat = entry.get("category") or ""
    if cat:
        return cat
    parts = (entry.get("path") or "").split("/")
    if len(parts) >= 2 and parts[0] in {"skills", "knowledge", "technique", "paper"}:
        return parts[1]
    return "misc"


def quality_score(entry: dict) -> int:
    desc = entry.get("description") or ""
    tags = entry.get("tags") or []
    score = 0
    if desc:
        score += 3
    if tags:
        score += min(len(tags), 5) + 2
    if entry.get("version"):
        score += 1
    if 80 <= len(desc) <= 220:
        score += 1
    name_tokens = [t for t in re.split(r"[-_]", entry.get("name") or "") if t]
    if 3 <= len(name_tokens) <= 8:
        score += 1
    return score


def clip(text: str, limit: int = 120) -> str:
    text = (text or "").replace("\n", " ").replace("|", "\\|").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=5, help="카테고리당 상위 N개")
    args = ap.parse_args()

    entries = json.loads(HUB_INDEX.read_text(encoding="utf-8"))
    for e in entries:
        e["category"] = resolve_category(e)

    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for e in entries:
        groups[(e.get("kind", "unknown"), e["category"])].append(e)

    now = dt.datetime.now().isoformat(timespec="seconds")
    lines: list[str] = []
    lines.append("# Skills Hub Lite Index (L1-compact)")
    lines.append("")
    lines.append(
        f"> 전체 {len(entries)}개 중 카테고리별 상위 {args.top}개만 발췌. "
        "세부 조회는 `00_MASTER_INDEX.md` 또는 `py hub_search.py`를 사용."
    )
    lines.append("")
    lines.append(f"- 생성 시각: {now}")
    lines.append(f"- 카테고리 버킷: {len(groups)}")
    lines.append("")

    lines.append("## Category Map")
    lines.append("")
    lines.append("| Kind | Category | 전체 | Lite |")
    lines.append("|---|---|---:|---:|")
    for (kind, cat) in sorted(groups.keys()):
        total = len(groups[(kind, cat)])
        shown = min(total, args.top)
        lines.append(f"| {kind} | {cat} | {total} | {shown} |")
    lines.append("")

    lines.append("## 대표 항목 (카테고리별 상위)")
    lines.append("")
    for (kind, cat) in sorted(groups.keys()):
        items = sorted(
            groups[(kind, cat)],
            key=lambda e: (-quality_score(e), e.get("name", "")),
        )[: args.top]
        lines.append(f"### {kind}/{cat}")
        lines.append("")
        for e in items:
            name = e.get("name", "")
            desc = clip(e.get("description") or e.get("summary") or "")
            lines.append(f"- `{name}` — {desc}")
        lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"wrote {OUT_PATH} ({len(entries)} entries considered, "
          f"{sum(min(len(v), args.top) for v in groups.values())} shown, "
          f"{size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
