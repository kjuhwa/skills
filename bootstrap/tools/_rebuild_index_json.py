"""Rebuild `index.json` from filesystem (skills/**/SKILL.md + knowledge/**/*.md + technique/**/TECHNIQUE.md + paper/**/PAPER.md).

Deterministic flat catalog regeneration for the corpus. Called by
`/hub-publish-all` before push so newly added skills/knowledge become
searchable via `/hub-find` immediately after merge.

Standalone usage:
    py -3 ~/.claude/skills-hub/tools/_rebuild_index_json.py
        --root ~/.claude/skills-hub/remote

Options:
    --root <dir>    Corpus root. Defaults to the parent of tools/ (i.e.
                    the skills-hub remote clone).
    --dry-run       Print what would change, don't write.
    --indent N      JSON indent (default 2).

Output stays on stdout when --dry-run, else writes <root>/index.json.
Existing extra fields on entries are preserved; only the standard
keys (kind, name, slug, category, description, tags, triggers,
version, path, has_content) are normalized.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

STANDARD_KEYS = (
    "kind", "name", "slug", "category", "description",
    "tags", "triggers", "version", "path", "has_content",
    "composes_count", "binding",
    "examines_count", "perspectives_count", "experiments_count",
    "outcomes_count", "proposed_builds_count", "paper_type", "paper_status",
)


def parse_frontmatter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    body = text[3:end]
    result: dict = {}
    for line in body.splitlines():
        if not line or line[0].isspace() or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            result[key] = (
                [t.strip().strip("'\"") for t in inner.split(",") if t.strip()]
                if inner else []
            )
        else:
            result[key] = val
    return result


def _is_archived(fm: dict) -> bool:
    val = fm.get("archived")
    if isinstance(val, str):
        return val.lower() in ("true", "yes", "1")
    return bool(val)


def entry_from_skill(root: Path, skill_md: Path) -> dict | None:
    fm = parse_frontmatter(skill_md.read_text(encoding="utf-8", errors="replace"))
    if _is_archived(fm):
        return None
    rel = skill_md.relative_to(root).as_posix()
    # path is the directory (skills/<cat>/<name>)
    path_dir = "/".join(rel.split("/")[:-1])
    has_content = (skill_md.parent / "content.md").exists()
    return {
        "kind": "skill",
        "name": fm.get("name", ""),
        "slug": fm.get("name", ""),
        "category": fm.get("category", ""),
        "description": fm.get("description", ""),
        "tags": fm.get("tags", []),
        "triggers": fm.get("triggers", []),
        "version": fm.get("version", ""),
        "path": path_dir,
        "has_content": has_content,
    }


def entry_from_knowledge(root: Path, md: Path) -> dict | None:
    fm = parse_frontmatter(md.read_text(encoding="utf-8", errors="replace"))
    if _is_archived(fm):
        return None
    rel = md.relative_to(root).as_posix()
    return {
        "kind": "knowledge",
        "name": fm.get("name", ""),
        "slug": fm.get("name", ""),
        "category": fm.get("category", ""),
        "description": fm.get("description") or fm.get("summary") or "",
        "tags": fm.get("tags", []),
        "triggers": fm.get("triggers", []),
        "version": fm.get("version", ""),
        "path": rel,
        "has_content": True,
    }


def entry_from_technique(root: Path, tech_md: Path) -> dict | None:
    raw_text = tech_md.read_text(encoding="utf-8", errors="replace")
    fm = parse_frontmatter(raw_text)
    if _is_archived(fm):
        return None
    rel = tech_md.relative_to(root).as_posix()
    path_dir = "/".join(rel.split("/")[:-1])
    # parse_frontmatter is flat-key-only and returns an empty string for the
    # list-of-dict-shaped composes. Count list items directly from the raw
    # frontmatter body so the index reflects reality.
    if raw_text.startswith("---"):
        end = raw_text.find("\n---", 3)
        fm_body = raw_text[3:end] if end != -1 else ""
    else:
        fm_body = ""
    composes_count = sum(
        1 for line in fm_body.splitlines() if line.lstrip().startswith("- kind:")
    )
    return {
        "kind": "technique",
        "name": fm.get("name", ""),
        "slug": fm.get("name", ""),
        "category": fm.get("category", ""),
        "description": fm.get("description", ""),
        "tags": fm.get("tags", []),
        "triggers": fm.get("triggers", []),
        "version": fm.get("version", ""),
        "path": path_dir,
        "has_content": True,
        "composes_count": composes_count,
        "binding": fm.get("binding", "loose"),
    }


def entry_from_paper(root: Path, paper_md: Path) -> dict | None:
    raw_text = paper_md.read_text(encoding="utf-8", errors="replace")
    fm = parse_frontmatter(raw_text)
    if _is_archived(fm):
        return None
    rel = paper_md.relative_to(root).as_posix()
    path_dir = "/".join(rel.split("/")[:-1])
    # parse_flat_keys does not read list-shaped fields. Count list items
    # directly from the raw frontmatter body.
    if raw_text.startswith("---"):
        end = raw_text.find("\n---", 3)
        fm_body = raw_text[3:end] if end != -1 else ""
    else:
        fm_body = ""
    def count_under(section: str, item_marker: str) -> int:
        count = 0
        in_section = False
        for line in fm_body.splitlines():
            if not line:
                continue
            if line[0] not in (" ", "\t"):
                in_section = line.startswith(f"{section}:")
                continue
            if in_section and line.lstrip().startswith(item_marker):
                count += 1
        return count

    return {
        "kind": "paper",
        "name": fm.get("name", ""),
        "slug": fm.get("name", ""),
        "category": fm.get("category", ""),
        "description": fm.get("description", ""),
        "tags": fm.get("tags", []),
        "triggers": fm.get("triggers", []),
        "version": fm.get("version", ""),
        "path": path_dir,
        "has_content": True,
        "examines_count": count_under("examines", "- kind:"),
        "perspectives_count": count_under("perspectives", "- name:"),
        "experiments_count": count_under("experiments", "- name:"),
        "outcomes_count": count_under("outcomes", "- kind:"),
        "proposed_builds_count": count_under("proposed_builds", "- slug:"),
        "paper_type": fm.get("type", "hypothesis"),
        "paper_status": fm.get("status", "draft"),
    }


def preserve_extras(existing_entries: list[dict], key: str) -> dict:
    """Keep non-standard keys (like source_project, installed_at) from old index."""
    out: dict = {}
    for e in existing_entries:
        k = (e.get("kind"), e.get("path"))
        extras = {kk: vv for kk, vv in e.items() if kk not in STANDARD_KEYS}
        if extras:
            out[k] = extras
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--indent", type=int, default=2)
    args = ap.parse_args()

    root = args.root
    index_path = root / "index.json"

    try:
        old = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    except Exception as exc:
        print(f"warn: could not parse existing index.json: {exc}", file=sys.stderr)
        old = []
    extras = preserve_extras(old, "extras")

    entries: list[dict] = []

    # Skills: one folder per skill, with SKILL.md inside.
    skills_root = root / "skills"
    if skills_root.exists():
        for p in sorted(skills_root.rglob("SKILL.md")):
            e = entry_from_skill(root, p)
            if e is None:  # archived
                continue
            key = (e["kind"], e["path"])
            if key in extras:
                e.update(extras[key])
            entries.append(e)

    # Knowledge: one .md file per entry.
    kn_root = root / "knowledge"
    if kn_root.exists():
        for p in sorted(kn_root.rglob("*.md")):
            e = entry_from_knowledge(root, p)
            if e is None:  # archived
                continue
            key = (e["kind"], e["path"])
            if key in extras:
                e.update(extras[key])
            entries.append(e)

    # Techniques: one folder per technique with TECHNIQUE.md inside.
    tech_root = root / "technique"
    if tech_root.exists():
        for p in sorted(tech_root.rglob("TECHNIQUE.md")):
            e = entry_from_technique(root, p)
            if e is None:  # archived
                continue
            key = (e["kind"], e["path"])
            if key in extras:
                e.update(extras[key])
            entries.append(e)

    # Papers: one folder per paper with PAPER.md inside.
    paper_root = root / "paper"
    if paper_root.exists():
        for p in sorted(paper_root.rglob("PAPER.md")):
            e = entry_from_paper(root, p)
            if e is None:  # archived
                continue
            key = (e["kind"], e["path"])
            if key in extras:
                e.update(extras[key])
            entries.append(e)

    entries.sort(key=lambda e: (e.get("kind", ""), e.get("category", ""), e.get("name", "")))

    serialized = json.dumps(entries, ensure_ascii=False, indent=args.indent) + "\n"
    old_serialized = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    changed = serialized != old_serialized

    if args.dry_run:
        added = len(entries) - len(old)
        print(f"entries: {len(entries)}  delta: {added:+d}  byte-diff: {len(serialized) - len(old_serialized):+d}")
        print("changed:", changed)
        return 0

    if changed:
        index_path.write_text(serialized, encoding="utf-8")
        print(f"wrote {index_path} ({len(entries)} entries)")
    else:
        print(f"no change ({len(entries)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
