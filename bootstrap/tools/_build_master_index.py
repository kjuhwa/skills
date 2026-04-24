"""Generate 00_MASTER_INDEX.md from the skills-hub index.json.

Implements the L1 index layer defined in 00_DESIGN_GUIDE.md:
  L1 Master Index  <-  this script's output
  L2 Category dirs <-  ~/.claude/skills-hub/remote/{skills,knowledge}/<cat>/
  L3 Skill node    <-  individual .md files with YAML frontmatter

Re-run whenever the hub's index.json changes:
    py _build_master_index.py
"""
from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
from collections import defaultdict
from pathlib import Path

HUB_ROOT = Path.home() / ".claude" / "skills-hub"
INDEX_JSON = HUB_ROOT / "remote" / "index.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "indexes" / "00_MASTER_INDEX.md"


def hub_git_info() -> tuple[str, str]:
    """Return (short commit, committer date) of the remote cache."""
    remote = HUB_ROOT / "remote"
    try:
        sha = subprocess.check_output(
            ["git", "-C", str(remote), "rev-parse", "--short", "HEAD"],
            text=True,
        ).strip()
        date = subprocess.check_output(
            ["git", "-C", str(remote), "log", "-1", "--format=%cI"],
            text=True,
        ).strip()
    except Exception:
        sha, date = "unknown", "unknown"
    return sha, date


def clip(text: str, limit: int = 180) -> str:
    text = (text or "").replace("\n", " ").replace("|", "\\|").strip()
    return text if len(text) <= limit else text[: limit - 1] + "…"


def tag_str(tags) -> str:
    if not tags:
        return ""
    return ", ".join(f"`{t}`" for t in tags)


def main() -> None:
    entries = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for e in entries:
        cat = e.get("category") or ""
        if not cat:
            # Fall back to first path segment after skills/, knowledge/, or technique/.
            parts = (e.get("path") or "").split("/")
            if len(parts) >= 2 and parts[0] in {"skills", "knowledge", "technique", "paper"}:
                cat = parts[1]
            else:
                cat = "misc"
            e["category"] = cat
        key = (e.get("kind", "unknown"), cat)
        groups[key].append(e)

    skills_total = sum(1 for e in entries if e.get("kind") == "skill")
    knowledge_total = sum(1 for e in entries if e.get("kind") == "knowledge")
    techniques_total = sum(1 for e in entries if e.get("kind") == "technique")
    papers_total = sum(1 for e in entries if e.get("kind") == "paper")
    commit, date = hub_git_info()
    now = dt.datetime.now().isoformat(timespec="seconds")

    lines: list[str] = []
    lines.append("# Skills Hub Master Index (L1)")
    lines.append("")
    lines.append(
        "> Auto-generated. Regenerate with `py _build_master_index.py` "
        "after `/hub-sync` pulls new entries."
    )
    lines.append("")
    lines.append("## Overview")
    lines.append("")
    lines.append(f"- **Total entries:** {len(entries)}")
    lines.append(f"- **Skills:** {skills_total}")
    lines.append(f"- **Knowledge:** {knowledge_total}")
    lines.append(f"- **Techniques:** {techniques_total}")
    lines.append(f"- **Papers:** {papers_total}")
    lines.append(f"- **Source commit:** `{commit}` ({date})")
    lines.append(f"- **Generated at:** {now}")
    lines.append("")
    lines.append(
        "AI usage: search this file first by keyword. "
        "Each row links to the source MD under `~/.claude/skills-hub/remote/`."
    )
    lines.append("")

    lines.append("## Category Map")
    lines.append("")
    lines.append("| Kind | Category | Count | Section |")
    lines.append("|---|---|---:|---|")
    for (kind, cat) in sorted(groups.keys()):
        anchor = f"{kind}-{cat}".lower().replace("/", "-")
        lines.append(
            f"| {kind} | {cat} | {len(groups[(kind, cat)])} | [#{anchor}](#{anchor}) |"
        )
    lines.append("")

    lines.append("## Entries by Category")
    lines.append("")
    for (kind, cat) in sorted(groups.keys()):
        anchor = f"{kind}-{cat}".lower().replace("/", "-")
        items = sorted(groups[(kind, cat)], key=lambda e: e.get("name", ""))
        lines.append(f"### {kind}/{cat}  <a id=\"{anchor}\"></a>")
        lines.append("")
        lines.append(f"_{len(items)} entries_")
        lines.append("")
        lines.append("| Name | Description | Tags | Path |")
        lines.append("|---|---|---|---|")
        for e in items:
            name = e.get("name", "")
            desc = clip(e.get("description", ""))
            tags = tag_str(e.get("tags", []))
            path = e.get("path", "")
            lines.append(f"| `{name}` | {desc} | {tags} | `{path}` |")
        lines.append("")

    lines.append("## Flat Name Index (Ctrl+F friendly)")
    lines.append("")
    for e in sorted(entries, key=lambda e: (e.get("kind", ""), e.get("name", ""))):
        kind = e.get("kind", "?")
        name = e.get("name", "")
        cat = e.get("category", "")
        desc = clip(e.get("description", ""), 120)
        lines.append(f"- **[{kind}/{cat}]** `{name}` — {desc}")
    lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT_PATH} ({len(entries)} entries, {OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
