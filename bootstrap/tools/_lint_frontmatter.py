"""설계 가이드 §3 프런트매터 스키마 린터.

`~/.claude/skills-hub/remote/` 아래 모든 스킬/지식 MD의 YAML 프런트매터가
필수 필드(name, description|summary, category, tags, version)를 채웠는지 검증한다.

사용법:
    py _lint_frontmatter.py           # 표준 리포트
    py _lint_frontmatter.py --strict  # `tags`가 비어 있어도 실패 처리
    py _lint_frontmatter.py --json    # JSON 결과
종료 코드:
    0  — 모든 파일 통과
    1  — 하나 이상의 위반
    2  — 구조 에러 (프런트매터 자체가 없음 / 깨짐)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HUB_ROOT = Path.home() / ".claude" / "skills-hub" / "remote"
SKILL_DIR = HUB_ROOT / "skills"
KNOWLEDGE_DIR = HUB_ROOT / "knowledge"
TECHNIQUE_DIR = HUB_ROOT / "technique"

REQUIRED = ["name", "description", "category", "tags", "version"]
# knowledge files often use `summary` instead of `description`.
ALIASES = {"description": ("description", "summary")}
# category must be a single kebab-case token (matching CATEGORIES.md entries).
# Prevents compound values like "agent-orchestration / workflow" that break
# downstream index builders that use category as a path segment.
CATEGORY_RE = re.compile(r"^[a-z][a-z0-9-]*$")


def extract_frontmatter(text: str) -> tuple[str | None, str | None]:
    """Return (raw_frontmatter, error). error is None on success."""
    if not text.startswith("---"):
        return None, "missing leading '---'"
    end = text.find("\n---", 3)
    if end == -1:
        return None, "missing closing '---'"
    return text[3:end].lstrip("\n"), None


def parse_flat_keys(raw: str) -> dict[str, str]:
    """Collect only the top-level (column 0) `key:` entries — values stay raw."""
    out: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []
    for line in raw.splitlines():
        if not line:
            continue
        if line[0].isspace() or line.startswith("#"):
            if current_key is not None:
                buffer.append(line)
            continue
        if ":" not in line:
            continue
        if current_key is not None:
            out[current_key] = (out[current_key] + "\n" + "\n".join(buffer)).rstrip()
            buffer = []
        key, _, value = line.partition(":")
        current_key = key.strip()
        out[current_key] = value.strip()
    if current_key is not None and buffer:
        out[current_key] = (out[current_key] + "\n" + "\n".join(buffer)).rstrip()
    return out


def value_is_empty(raw: str) -> bool:
    if raw is None:
        return True
    stripped = raw.strip()
    if stripped in ("", "[]", "''", '""', "null", "~"):
        return True
    return False


def parse_composes(raw_fm: str) -> list[dict[str, str]]:
    """Extract composes[] entries from a raw frontmatter block.

    parse_flat_keys cannot handle list-of-dict fields, so we scan the raw
    text. Returns a list of dicts with at least a 'kind' key per entry
    and whatever other sub-keys (ref, version, role) appeared on the
    indented follow-up lines.
    """
    entries: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    in_composes = False
    for line in raw_fm.splitlines():
        if not line:
            continue
        # Top-level (column-0) key terminates any prior block.
        if line[0] not in (" ", "\t"):
            if current is not None:
                entries.append(current)
                current = None
            in_composes = line.startswith("composes:")
            continue
        if not in_composes:
            continue
        stripped = line.strip()
        if stripped.startswith("- kind:"):
            if current is not None:
                entries.append(current)
            current = {"kind": stripped.split(":", 1)[1].strip()}
        elif current is not None and ":" in stripped and not stripped.startswith("-"):
            k, v = stripped.split(":", 1)
            current[k.strip()] = v.strip().strip('"\'')
    if current is not None:
        entries.append(current)
    return entries


def lint_technique_composes(raw_fm: str) -> list[str]:
    """Return technique-specific lint errors for the composes[] list.

    Enforces v0.1 schema rules:
    - composes must have at least one entry
    - kind must be 'skill' or 'knowledge' (technique nesting forbidden)
    - ref must resolve to an actual file on disk (kind-root-relative path)
    """
    errors: list[str] = []
    entries = parse_composes(raw_fm)
    if not entries:
        errors.append("composes: must contain at least one entry")
        return errors
    for i, e in enumerate(entries):
        kind = e.get("kind", "")
        ref = e.get("ref", "")
        if not kind:
            errors.append(f"composes[{i}]: missing kind")
            continue
        if kind == "technique":
            errors.append(
                f"composes[{i}]: technique-to-technique composition forbidden in v0"
            )
            continue
        if kind not in ("skill", "knowledge"):
            errors.append(
                f"composes[{i}]: unknown kind {kind!r} (must be skill or knowledge)"
            )
            continue
        if not ref:
            errors.append(f"composes[{i}]: missing ref")
            continue
        if kind == "skill":
            target = SKILL_DIR / ref / "SKILL.md"
        else:
            target = KNOWLEDGE_DIR / f"{ref}.md"
        if not target.exists():
            errors.append(
                f"composes[{i}]: {kind} ref not found: {ref!r} "
                f"(expected {target.relative_to(HUB_ROOT).as_posix()})"
            )
    return errors


def find_duplicate_top_level_keys(raw_fm: str) -> list[str]:
    """Return list of top-level keys that appear more than once in the frontmatter.

    Duplicate keys cause silent last-wins overwrites in YAML consumers
    (including the lint itself via parse_flat_keys). In the #1075 incident
    a stacked-PR merge produced two `status:` keys — one 'implemented' and
    one 'draft' — and the stale 'draft' value silently won on parse. This
    check surfaces that class of merge damage at lint time.
    """
    seen: set[str] = set()
    dups: set[str] = set()
    for line in raw_fm.splitlines():
        if not line or line[0].isspace() or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key = line.split(":", 1)[0].strip()
        if not key:
            continue
        if key in seen:
            dups.add(key)
        else:
            seen.add(key)
    return sorted(dups)


def scan_file(path: Path) -> dict:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as exc:
        return {"path": str(path), "errors": [f"read-failure: {exc}"], "missing": []}
    raw, err = extract_frontmatter(text)
    if err:
        return {"path": str(path), "errors": [err], "missing": REQUIRED[:]}
    fields = parse_flat_keys(raw)
    missing: list[str] = []
    for required in REQUIRED:
        candidates = ALIASES.get(required, (required,))
        if not any(c in fields and not value_is_empty(fields[c]) for c in candidates):
            missing.append(required)
    errors: list[str] = []
    dup_keys = find_duplicate_top_level_keys(raw)
    if dup_keys:
        errors.append(
            f"duplicate top-level frontmatter keys: {', '.join(dup_keys)} "
            f"(likely stacked-PR merge residue; YAML silently takes the last value)"
        )
    category_val = fields.get("category", "").strip()
    if category_val and not CATEGORY_RE.match(category_val):
        errors.append(
            f"invalid category format: {category_val!r} (must be single "
            f"kebab-case token — no '/', '\\\\', or spaces)"
        )
    if path.name == "TECHNIQUE.md":
        errors.extend(lint_technique_composes(raw))
    return {"path": str(path), "errors": errors, "missing": missing, "fields": list(fields)}


def iter_md_files() -> list[Path]:
    files: list[Path] = []
    if SKILL_DIR.exists():
        files.extend(SKILL_DIR.rglob("SKILL.md"))
    if KNOWLEDGE_DIR.exists():
        files.extend(KNOWLEDGE_DIR.rglob("*.md"))
    if TECHNIQUE_DIR.exists():
        files.extend(TECHNIQUE_DIR.rglob("TECHNIQUE.md"))
    return files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--json", dest="as_json", action="store_true")
    args = ap.parse_args()

    files = iter_md_files()
    results = [scan_file(p) for p in files]

    failures: list[dict] = []
    structure_errors: list[dict] = []
    missing_by_field: Counter[str] = Counter()
    missing_by_category: dict[str, Counter[str]] = defaultdict(Counter)

    for r in results:
        if r["errors"]:
            structure_errors.append(r)
            continue
        bad = list(r["missing"])
        if not args.strict and bad == ["tags"]:
            # 태그는 기본적으로 누락을 경고만 하고 실패로는 올리지 않음
            continue
        if bad:
            failures.append(r)
            cat = Path(r["path"]).relative_to(HUB_ROOT).parts
            cat_key = "/".join(cat[:2])  # e.g. skills/ai
            for field in bad:
                missing_by_field[field] += 1
                missing_by_category[cat_key][field] += 1

    if args.as_json:
        print(json.dumps({
            "total": len(results),
            "structure_errors": structure_errors,
            "failures": failures,
            "missing_by_field": dict(missing_by_field),
        }, ensure_ascii=False, indent=2))
    else:
        print(f"총 {len(results)}개 파일 검사")
        if structure_errors:
            print(f"\n[구조 에러] {len(structure_errors)}건")
            for r in structure_errors[:10]:
                print(f"  - {r['path']} :: {'; '.join(r['errors'])}")
            if len(structure_errors) > 10:
                print(f"  ... 외 {len(structure_errors)-10}건")
        print(f"\n[필수 필드 누락] {len(failures)}건")
        for field, n in missing_by_field.most_common():
            print(f"  {field:15} {n}")
        print("\n[카테고리별 누락 상위 10]")
        cat_totals = sorted(
            ((cat, sum(c.values())) for cat, c in missing_by_category.items()),
            key=lambda x: -x[1],
        )
        for cat, total in cat_totals[:10]:
            fields = missing_by_category[cat]
            detail = ", ".join(f"{k}:{v}" for k, v in fields.most_common())
            print(f"  {cat:35} {total:4}  ({detail})")
        if failures:
            print("\n[샘플 위반 파일 20개]")
            for r in failures[:20]:
                print(f"  - {r['path']}")
                print(f"      missing: {', '.join(r['missing'])}")
        print()
    if structure_errors:
        return 2
    if failures:
        return 1
    print("PASS — 모든 파일이 스키마를 만족합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
