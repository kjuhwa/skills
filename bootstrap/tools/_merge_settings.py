#!/usr/bin/env python3
"""
Merge (or remove) the skills-hub UserPromptSubmit hook entry in
~/.claude/settings.json.

Idempotent: entries are tagged with {"_marker": "skills-hub:auto-suggest-hook"}.
On install, any pre-existing entries carrying that marker are stripped before
the fresh one is appended, so reinstalling cleanly replaces the registration.

Usage:
    python _merge_settings.py install   <settings.json> < command-on-stdin
    python _merge_settings.py uninstall <settings.json>

The install subcommand reads the hook command as a single line from stdin and
writes it verbatim into settings.json. Passing the command through stdin
avoids cross-shell argv quoting issues (Windows/PowerShell in particular strips
embedded quotes from arguments).
"""
import json
import os
import sys

MARKER = "skills-hub:auto-suggest-hook"


def _load(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError, ValueError):
        return {}


def _dump(path: str, obj: dict) -> None:
    parent = os.path.dirname(path)
    if parent and not os.path.isdir(parent):
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _is_skills_hub_group(group: dict) -> bool:
    """True if any hook in the group is marked as ours, or its command
    references the hub-suggest-hint script (fallback for pre-marker installs).
    """
    for h in group.get("hooks", []) or []:
        if not isinstance(h, dict):
            continue
        if h.get("_marker") == MARKER:
            return True
        cmd = h.get("command") or ""
        if "hub-suggest-hint" in cmd:
            return True
    return False


def install(settings_path: str, command: str) -> int:
    settings = _load(settings_path)
    hooks = settings.setdefault("hooks", {})
    ups = hooks.setdefault("UserPromptSubmit", [])
    if not isinstance(ups, list):
        ups = []
        hooks["UserPromptSubmit"] = ups
    ups[:] = [g for g in ups if isinstance(g, dict) and not _is_skills_hub_group(g)]
    ups.append({
        "matcher": "*",
        "hooks": [{
            "type": "command",
            "command": command,
            "_marker": MARKER,
        }],
    })
    _dump(settings_path, settings)
    return 0


def uninstall(settings_path: str) -> int:
    if not os.path.exists(settings_path):
        return 0
    settings = _load(settings_path)
    hooks = settings.get("hooks")
    if not isinstance(hooks, dict):
        return 0
    ups = hooks.get("UserPromptSubmit")
    if not isinstance(ups, list):
        return 0
    before = len(ups)
    ups[:] = [g for g in ups if isinstance(g, dict) and not _is_skills_hub_group(g)]
    if not ups:
        hooks.pop("UserPromptSubmit", None)
    if not hooks:
        settings.pop("hooks", None)
    if len(ups) != before:
        _dump(settings_path, settings)
    return 0


def main(argv: list) -> int:
    if len(argv) >= 3 and argv[1] == "install":
        command = sys.stdin.read().strip()
        if not command:
            sys.stderr.write("install: empty command on stdin\n")
            return 2
        return install(argv[2], command)
    if len(argv) >= 3 and argv[1] == "uninstall":
        return uninstall(argv[2])
    sys.stderr.write(
        "usage: _merge_settings.py install <settings.json> < command-on-stdin\n"
        "       _merge_settings.py uninstall <settings.json>\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
