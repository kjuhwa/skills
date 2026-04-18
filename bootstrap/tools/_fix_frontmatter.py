"""프런트매터 자동 보정기.

`_lint_frontmatter.py`가 잡아낸 누락 필드를 안전한 기본값으로 채운다.

보정 대상과 기본값:
  - name      : 파일 경로(폴더/파일명)에서 추출한 kebab-case
  - category  : `skills/<cat>/...` 또는 `knowledge/<cat>/...` 경로 세그먼트
  - version   : "0.1.0-draft"
  - tags      : 자신 있게 추정 가능한 경우에만 보강 (category 와 name 토큰)
                그렇지 않으면 건드리지 않고 보고만 한다.

`description` / `summary`는 의미 손실을 막기 위해 자동 채우지 않는다.

사용법:
    py _fix_frontmatter.py                 # 기본: dry-run (수정 미리보기)
    py _fix_frontmatter.py --apply         # 실제 파일 덮어쓰기
    py _fix_frontmatter.py --apply --only-missing=name,version

주의: 원격 clone(`~/.claude/skills-hub/remote`) 내부 파일을 덮어쓰면
`/hub-sync` 시 충돌이 날 수 있다. 드래프트는 `.skills-draft/`에서 수정 후
업스트림 PR을 여는 흐름이 권장된다.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

HUB_ROOT = Path.home() / ".claude" / "skills-hub" / "remote"
SKILL_DIR = HUB_ROOT / "skills"
KNOWLEDGE_DIR = HUB_ROOT / "knowledge"

DEFAULT_VERSION = "0.1.0-draft"
SUPPORTED_FIELDS = ("name", "category", "tags", "version")


@dataclass
class Patch:
    path: Path
    added: dict[str, str]      # key -> rendered yaml line
    inferred_tags: list[str]   # 참고용
    skipped_reasons: list[str]


def read_file(path: Path) -> tuple[str, str, str]:
    """Return (pre, frontmatter_body, post) preserving '---' delimiters."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError("missing leading '---'")
    end = text.find("\n---", 3)
    if end == -1:
        raise ValueError("missing closing '---'")
    body = text[3:end].lstrip("\n")
    post = text[end:]
    return "---\n", body, post


def parse_keys(body: str) -> dict[str, int]:
    """Return top-level key names mapped to their first line index."""
    keys: dict[str, int] = {}
    for i, line in enumerate(body.splitlines()):
        if not line or line[0].isspace() or line.startswith("#"):
            continue
        if ":" in line:
            key = line.split(":", 1)[0].strip()
            keys.setdefault(key, i)
    return keys


def infer_name(path: Path) -> str:
    if path.name == "SKILL.md":
        return path.parent.name
    return path.stem


def infer_category(path: Path) -> str | None:
    try:
        rel = path.relative_to(HUB_ROOT).parts
    except ValueError:
        return None
    if len(rel) >= 3 and rel[0] in {"skills", "knowledge"}:
        return rel[1]
    return None


def infer_tags(name: str, category: str | None) -> list[str]:
    tokens = [t for t in re.split(r"[-_]", name.lower()) if t]
    if category:
        tokens = [category, *tokens]
    # 중복 제거, 짧은 숫자/단문자 제거
    seen: list[str] = []
    for t in tokens:
        if len(t) <= 2 or t.isdigit():
            continue
        if t not in seen:
            seen.append(t)
    return seen[:6]


def build_patch(path: Path, allow: set[str]) -> Patch:
    pre, body, post = read_file(path)
    existing = parse_keys(body)
    added: dict[str, str] = {}
    skipped: list[str] = []
    inferred_tags: list[str] = []

    if "name" in allow and "name" not in existing:
        added["name"] = f"name: {infer_name(path)}"
    if "category" in allow and "category" not in existing:
        cat = infer_category(path)
        if cat:
            added["category"] = f"category: {cat}"
        else:
            skipped.append("category: 경로에서 추정 불가")
    if "version" in allow and "version" not in existing:
        added["version"] = f"version: {DEFAULT_VERSION}"
    if "tags" in allow and "tags" not in existing:
        cat = infer_category(path)
        name = infer_name(path)
        tags = infer_tags(name, cat)
        if len(tags) >= 3:
            added["tags"] = "tags: [" + ", ".join(tags) + "]"
            inferred_tags = tags
        else:
            skipped.append("tags: 자동 추정치가 너무 적음")

    return Patch(path=path, added=added, inferred_tags=inferred_tags, skipped_reasons=skipped)


def render_updated_file(path: Path, patch: Patch) -> str:
    pre, body, post = read_file(path)
    insert_lines = [patch.added[k] for k in ("name", "category", "version", "tags") if k in patch.added]
    new_body = "\n".join(insert_lines) + ("\n" if insert_lines else "") + body
    return pre + new_body + post


def iter_md_files() -> list[Path]:
    files: list[Path] = []
    if SKILL_DIR.exists():
        files.extend(SKILL_DIR.rglob("SKILL.md"))
    if KNOWLEDGE_DIR.exists():
        files.extend(KNOWLEDGE_DIR.rglob("*.md"))
    return files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="실제 파일 덮어쓰기")
    ap.add_argument(
        "--only-missing",
        default=",".join(SUPPORTED_FIELDS),
        help="보정할 필드 (콤마 구분). 기본: name,category,tags,version",
    )
    ap.add_argument("--limit", type=int, default=0, help="처리 최대 파일 수 (디버그용)")
    args = ap.parse_args()

    allow = {f.strip() for f in args.only_missing.split(",") if f.strip()}
    unknown = allow - set(SUPPORTED_FIELDS)
    if unknown:
        print(f"지원하지 않는 필드: {unknown}", file=sys.stderr)
        return 2

    patches: list[Patch] = []
    files = iter_md_files()
    for p in files:
        try:
            patch = build_patch(p, allow)
        except Exception as exc:
            print(f"SKIP {p}  ({exc})")
            continue
        if patch.added or patch.skipped_reasons:
            patches.append(patch)

    to_fix = [p for p in patches if p.added]
    print(f"검사한 파일: {len(files)}")
    print(f"보정 후보 파일: {len(to_fix)} (추가될 필드 기준)")
    print()

    if args.limit:
        to_fix = to_fix[: args.limit]

    for patch in to_fix[:20]:
        rel = patch.path.relative_to(HUB_ROOT)
        print(f"--- {rel}")
        for line in patch.added.values():
            print(f"  + {line}")
        for reason in patch.skipped_reasons:
            print(f"  ! {reason}")
    if len(to_fix) > 20:
        print(f"... 외 {len(to_fix)-20}건")

    if args.apply:
        print()
        print(f"[APPLY] {len(to_fix)}개 파일을 덮어씁니다.")
        for patch in to_fix:
            text = render_updated_file(patch.path, patch)
            patch.path.write_text(text, encoding="utf-8")
        print("완료.")
    else:
        print()
        print("[DRY-RUN] 실제 수정 없음. 덮어쓰려면 --apply.")

    skipped_only = [p for p in patches if not p.added and p.skipped_reasons]
    if skipped_only:
        print()
        print(f"[수동 확인 필요] {len(skipped_only)}건")
        for patch in skipped_only[:10]:
            rel = patch.path.relative_to(HUB_ROOT)
            print(f"  - {rel} :: {'; '.join(patch.skipped_reasons)}")
        if len(skipped_only) > 10:
            print(f"  ... 외 {len(skipped_only)-10}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
