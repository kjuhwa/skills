---
name: bash-var-length-counts-bytes-not-chars
description: "Bash ${#var} returns byte length, not character count; UTF-8 multibyte (Korean, em-dash) inflates apparent length"
category: pitfall
tags:
  - bash
  - utf-8
  - encoding
  - string-length
  - linting
version: 0.1.0-draft
---

# Pitfall: bash `${#var}` counts bytes, not characters

## Symptom

A description-length lint check (rule: "≤ 120 characters") fires for a string that *visually* fits within the budget. Manual character count agrees with the budget; bash `${#var}` disagrees.

Concrete example from `paper/ai/llm-fallback-cost-displacement` description check:

```bash
DESC="Iterative loop turning fuzz crashes into TDD'd fixes: investigate → triage → implement → return crash to seed corpus"
echo ${#DESC}        # prints 122 — appears over limit

python3 -c "print(len('$DESC'))"   # prints 116 — under limit
```

The two arrow characters (`→`, U+2192, 3 bytes each in UTF-8) account for the gap. The string is 116 *characters* but 122 *bytes*.

## Cause

Bash parameter-length expansion `${#var}` returns the **byte count** of the variable's value when bash is built with byte-based string handling (the default on most Linux/macOS distributions). Multibyte UTF-8 sequences inflate the count.

Most schema rules express limits in **characters**, not bytes — e.g.:
- "description ≤ 120 chars"
- "title ≤ 80 chars"
- "first paragraph ≤ 200 chars"

So `${#var}` is the wrong primitive whenever the string may contain non-ASCII (Korean, em-dash, arrows, emoji, smart quotes, etc.).

## Fix

Use a Unicode-aware length primitive:

```bash
# Python (always character-correct)
python3 -c "import sys; print(len(sys.argv[1]))" "$DESC"

# wc -m with UTF-8 locale
echo -n "$DESC" | LC_ALL=en_US.UTF-8 wc -m

# awk in some implementations (less portable)
echo -n "$DESC" | awk '{print length($0)}'
```

For shell scripts that lint description lengths, use `python3 -c "print(len(...))"` — most portable and unambiguous.

## When you might still want bytes

- File-size budgets (KB, not chars) — bytes is correct
- Network protocol payload limits — bytes is correct
- ANY budget expressed in "no more than N bytes" — bytes is correct

For *content* limits (titles, descriptions, summaries) where the rule was authored in character-thinking, characters is correct.

## Related

- Hub schema rules expressing limits in characters: `paper/` schema §6 rule 4 (description ≤ 120), `technique/` schema §9 rule 4
- Lint scripts running in bash should call out to Python for string-length checks rather than `${#var}`
