"""커밋 기준 인덱스 변경 리포트.

지정된 <base-ref> 커밋 이후로 `index.json`에 추가/제거되었거나
실제 MD 파일이 수정된 항목만 뽑아 보여준다. 릴리스 노트 초안이나
`/hub-sync` 후 "무엇이 바뀌었나" 확인용.

사용법:
    py _index_diff.py                    # 기본: HEAD~1 대비
    py _index_diff.py ae3e15d            # 특정 커밋 대비
    py _index_diff.py main               # main 브랜치 대비
    py _index_diff.py --json HEAD~5      # JSON 결과
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

HUB_ROOT = Path.home() / ".claude" / "skills-hub" / "remote"
INDEX_JSON = HUB_ROOT / "index.json"


def git(*args: str) -> str:
    try:
        raw = subprocess.check_output(
            ["git", "-C", str(HUB_ROOT), *args],
            stderr=subprocess.STDOUT,
        )
        return raw.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError as exc:
        msg = (exc.output or b"").decode("utf-8", errors="replace").strip()
        print(f"git error: {msg}", file=sys.stderr)
        sys.exit(2)


def load_index_at(ref: str | None) -> list[dict]:
    """ref가 None이면 현재 워킹트리의 index.json을 읽는다."""
    if ref is None:
        return json.loads(INDEX_JSON.read_text(encoding="utf-8"))
    raw = git("show", f"{ref}:index.json")
    return json.loads(raw)


def index_by_path(entries: list[dict]) -> dict[str, dict]:
    return {e.get("path", ""): e for e in entries if e.get("path")}


def changed_files(base: str) -> set[str]:
    """base..HEAD 사이에서 변경된 파일 경로(skills/, knowledge/ 한정)."""
    raw = git("diff", "--name-only", f"{base}...HEAD")
    files = set()
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith(("skills/", "knowledge/")):
            files.add(line)
    return files


def find_entry_for_file(path: str, entries: dict[str, dict]) -> dict | None:
    """
    MD 파일 경로(예: skills/ai/foo/SKILL.md)를 index 엔트리로 매핑.
    index 엔트리의 'path'는 보통 'skills/ai/foo' (디렉터리) 또는
    'knowledge/api/foo.md' (파일) 이다.
    """
    if path in entries:
        return entries[path]
    # SKILL.md / content.md 경우: 부모 디렉터리 매치
    parent = path.rsplit("/", 1)[0]
    if parent in entries:
        return entries[parent]
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("base", nargs="?", default="HEAD~1",
                    help="비교 기준 커밋/ref (기본 HEAD~1)")
    ap.add_argument("--json", dest="as_json", action="store_true")
    args = ap.parse_args()

    base = args.base
    old = index_by_path(load_index_at(base))
    new = index_by_path(load_index_at(None))

    added_paths = sorted(set(new) - set(old))
    removed_paths = sorted(set(old) - set(new))

    modified_files = changed_files(base)
    modified_entries: dict[str, dict] = {}
    for f in modified_files:
        entry = find_entry_for_file(f, new)
        if entry is None:
            continue
        p = entry.get("path", "")
        if p in added_paths:  # 이미 added 로 분류됨
            continue
        modified_entries[p] = entry

    def render_entry(e: dict) -> str:
        return (
            f"  {e.get('kind','?')}/{e.get('category','') or '-':12} "
            f"{e.get('name','')}"
        )

    if args.as_json:
        result = {
            "base": base,
            "added": [new[p] for p in added_paths],
            "removed": [old[p] for p in removed_paths],
            "modified": list(modified_entries.values()),
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    head = git("rev-parse", "--short", "HEAD").strip()
    base_sha = git("rev-parse", "--short", base).strip()
    print(f"인덱스 변경 리포트: {base_sha} → {head}")
    print(f"  추가  {len(added_paths):4}")
    print(f"  수정  {len(modified_entries):4}")
    print(f"  제거  {len(removed_paths):4}")
    print()
    if added_paths:
        print("[추가]")
        for p in added_paths:
            print(render_entry(new[p]))
        print()
    if modified_entries:
        print("[수정]")
        for e in modified_entries.values():
            print(render_entry(e))
        print()
    if removed_paths:
        print("[제거]")
        for p in removed_paths:
            print(render_entry(old[p]))
        print()
    if not (added_paths or modified_entries or removed_paths):
        print("변경 없음.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
