---
version: 0.1.0-draft
name: redos-in-dns-detector-character-class
summary: DNS-style hostname detectors with patterns like (.label)+ are vulnerable to catastrophic backtracking (ReDoS) flagged by CodeQL. Fix: exclude '.' from the inner character class so the outer alternation cannot ambiguously match the same characters.
category: pitfall
tags: [regex, redos, security, codeql, hostname-detector]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/masking/detectors.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Pitfall: ReDoS in DNS-Style Hostname Detectors

## The vulnerability
A naive DNS hostname regex like:
```
[a-z0-9.-]+\.(?:com|net|org|...)
```
is exponential on inputs of the form `aaaa...!` because the engine has many ways to allocate characters between the inner class and the outer dot-suffix. CodeQL flags this as ReDoS.

## The fix
Make the inner character class **not** match `.`, then add an explicit `(?:\.LABEL)*` outside to consume dot-separated segments unambiguously.

```python
_HOSTNAME_RE = re.compile(
    r"\b("
    r"kind-[a-z0-9][-a-z0-9]*"            # local kind clusters
    # Note: the inner character class excludes '.' so the outer (?:\.LABEL)*
    # has no ambiguity and cannot backtrack exponentially (CodeQL ReDoS).
    r"|ip-\d+-\d+-\d+-\d+(?:\.[a-z0-9][a-z0-9-]*)*"
    r"|[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+\.(?:com|net|org|io|internal|local|cloud)"
    r")\b",
    re.IGNORECASE,
)
```

Each label uses `[a-z0-9][-a-z0-9]*` which excludes `.`. The dot is only consumed by the explicit `\.` between groups.

## Why this matters in practice
- The detector runs on every log message before the LLM call. A maliciously crafted log payload could DoS the agent.
- CodeQL surfaces these as `js/regex/redos` or `py/redos`; treat them as P1 fixes.
- Use `re2` (`pip install pyre2`) for genuinely user-controlled regex evaluation — it has linear-time guarantees but doesn't support all PCRE features.

## Generalize
For any "list of labels separated by delimiter" regex:
- Inner label class: must not contain the delimiter.
- Repetition: explicit `(?:DELIM LABEL)*` outside the label group.
- Test with adversarial inputs of the form `<label>` × N + invalid suffix.
