"""L2 카테고리 인덱스 생성기.

각 (kind, category) 버킷별로 INDEX.md를 생성한다.
출력 경로: F:/workspace/blank/category_indexes/<kind>/<category>/INDEX.md

설계 가이드 §2 L2 레벨을 채운다 — AI가 큰 카테고리 하나를 열어서
그 안의 모든 스킬/지식 목록을 바로 볼 수 있도록 한다.

사용법:  py _build_category_indexes.py
"""
from __future__ import annotations

import datetime as dt
import json
import shutil
from collections import defaultdict
from pathlib import Path

HUB_INDEX = Path.home() / ".claude" / "skills-hub" / "remote" / "index.json"
OUT_ROOT = Path(__file__).resolve().parent.parent / "indexes" / "category_indexes"


def clip(text: str, limit: int = 200) -> str:
    text = (text or "").replace("\n", " ").replace("|", "\\|").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def tag_str(tags) -> str:
    return ", ".join(f"`{t}`" for t in tags) if tags else ""


def resolve_category(entry: dict) -> str:
    cat = entry.get("category") or ""
    if cat:
        return cat
    parts = (entry.get("path") or "").split("/")
    if len(parts) >= 2 and parts[0] in {"skills", "knowledge", "technique", "paper"}:
        return parts[1]
    return "misc"


def main() -> None:
    entries = json.loads(HUB_INDEX.read_text(encoding="utf-8"))
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for e in entries:
        cat = resolve_category(e)
        e["category"] = cat
        groups[(e.get("kind", "unknown"), cat)].append(e)

    if OUT_ROOT.exists():
        shutil.rmtree(OUT_ROOT)
    OUT_ROOT.mkdir(parents=True)

    now = dt.datetime.now().isoformat(timespec="seconds")
    written = 0
    for (kind, cat), items in sorted(groups.items()):
        items.sort(key=lambda e: e.get("name", ""))
        out_dir = OUT_ROOT / kind / cat
        out_dir.mkdir(parents=True, exist_ok=True)
        lines: list[str] = []
        lines.append(f"# {kind}/{cat} 카테고리 인덱스 (L2)")
        lines.append("")
        lines.append(f"- **항목 수:** {len(items)}")
        lines.append(f"- **생성 시각:** {now}")
        lines.append(
            f"- **상위 인덱스:** [../../../00_MASTER_INDEX.md](../../../00_MASTER_INDEX.md)"
        )
        lines.append("")
        lines.append("## 목록")
        lines.append("")
        lines.append("| # | 이름 | 설명 | 태그 | 경로 |")
        lines.append("|---:|---|---|---|---|")
        for i, e in enumerate(items, 1):
            lines.append(
                f"| {i} | `{e.get('name','')}` | {clip(e.get('description',''))}"
                f" | {tag_str(e.get('tags', []))} | `{e.get('path','')}` |"
            )
        lines.append("")
        (out_dir / "INDEX.md").write_text("\n".join(lines), encoding="utf-8")
        written += 1

    # Top-level README for category_indexes/.
    readme = OUT_ROOT / "README.md"
    lines = [
        "# 카테고리 인덱스 (L2)",
        "",
        f"- 생성 시각: {now}",
        f"- 총 카테고리: {len(groups)}",
        "",
        "| Kind | Category | 항목 수 | 인덱스 |",
        "|---|---|---:|---|",
    ]
    for (kind, cat), items in sorted(groups.items()):
        rel = f"{kind}/{cat}/INDEX.md"
        lines.append(f"| {kind} | {cat} | {len(items)} | [{rel}]({rel}) |")
    lines.append("")
    readme.write_text("\n".join(lines), encoding="utf-8")

    print(f"wrote {written} category INDEX.md files under {OUT_ROOT}")


if __name__ == "__main__":
    main()
