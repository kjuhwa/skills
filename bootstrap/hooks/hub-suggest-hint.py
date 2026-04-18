#!/usr/bin/env python3
"""
skills-hub UserPromptSubmit hook.

If the user's prompt contains implementation keywords (개발/구현/build/create/...),
emit a <system-reminder> to nudge Claude toward running /hub-suggest first, so
existing skills and knowledge are checked before implementation starts.

Opt out at runtime: set SKILLS_HUB_NO_AUTO_SUGGEST=1 in the environment.
"""
import json
import os
import re
import sys

IMPL_PATTERNS = [
    # Korean — substring match (no reliable word boundaries)
    re.compile(r"개발(?:해|하|할|합|하세|해줘|해봐|해주)"),
    re.compile(r"구현(?:해|하|할|합|하세|해줘|해봐)"),
    re.compile(r"만들(?:어|기|자|어줘|어봐|어주|어주세요)"),
    re.compile(r"짜(?:줘|봐|주세요)"),
    re.compile(r"작성(?:해|하|할|해줘)"),
    re.compile(r"구축(?:해|하|할|해줘)"),
    re.compile(r"추가(?:해|하|할|해줘)"),
    # English — word-boundary aware, case-insensitive
    re.compile(r"\bimplement(?:s|ed|ing)?\b", re.IGNORECASE),
    re.compile(r"\bbuild(?:s|ing)?\b", re.IGNORECASE),
    re.compile(r"\bcreate(?:s|d|ing)?\b", re.IGNORECASE),
    re.compile(r"\bdevelop(?:s|ed|ing)?\b", re.IGNORECASE),
    re.compile(r"\bscaffold(?:s|ed|ing)?\b", re.IGNORECASE),
    re.compile(r"\bwrite\s+(?:a|an|me|some)\b", re.IGNORECASE),
    re.compile(r"\badd\s+(?:a|an|new|the)\b", re.IGNORECASE),
]

REMINDER = (
    "<system-reminder>\n"
    "skills-hub auto-check: implementation intent detected in the user prompt.\n"
    "BEFORE writing any code, invoke /hub-suggest with a keyword derived from "
    "the task so the hub can surface existing skills or knowledge first.\n"
    "This hook was installed by skills-hub bootstrap. "
    "Opt out with env var SKILLS_HUB_NO_AUTO_SUGGEST=1.\n"
    "Matched keyword: {kw}\n"
    "</system-reminder>"
)


def main() -> int:
    if os.environ.get("SKILLS_HUB_NO_AUTO_SUGGEST") == "1":
        return 0
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    prompt = data.get("prompt") or ""
    if not prompt:
        return 0
    # Skip explicit slash-command invocations — user already picked a command.
    if prompt.lstrip().startswith("/"):
        return 0
    for pat in IMPL_PATTERNS:
        m = pat.search(prompt)
        if m:
            sys.stdout.write(REMINDER.format(kw=m.group(0)) + "\n")
            return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
