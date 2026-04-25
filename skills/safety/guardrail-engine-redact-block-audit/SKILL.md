---
name: guardrail-engine-redact-block-audit
description: Scan LLM-bound text against a YAML rule set with three actions (redact, block, audit), splice replacements in reverse so earlier positions stay valid, raise a typed error on block, and append a JSONL audit entry for every match.
category: safety
version: 1.0.0
version_origin: extracted
tags: [guardrails, redaction, audit, yaml-rules, llm-safety]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/guardrails/engine.py
imported_at: 2026-04-18T00:00:00Z
---

# Guardrail Engine: Redact / Block / Audit

## When to use
You need a uniform pre-LLM filter that supports three behaviors at once: redact secrets in place (with a custom replacement string), block the call entirely if a forbidden term appears, and emit an audit trail for compliance. Rules are user-editable YAML.

## How it works
- Rules are defined in `~/.opensre/guardrails.yml` and parsed into `GuardrailRule` (regex patterns + literal keywords + action enum).
- `engine.scan(text)` collects all matches without mutating; `engine.apply(text)` performs the side-effecting redact/audit/block sequence.
- Replacements are spliced in reverse-by-start order so earlier indices remain valid; an extra `seen_end` cursor drops overlapping matches that snuck through.
- Block raises `GuardrailBlockedError` with the offending rule names; the LLM client catches and re-raises so the exception propagates cleanly.

## Example
```python
class GuardrailEngine:
    def apply(self, text: str) -> str:
        result = self.scan(text)
        if not result.matches:
            return text

        for match in result.matches:
            if self._audit:
                self._audit.log(rule_name=match.rule_name,
                                action=match.action.value,
                                matched_text_preview=match.matched_text)

        if result.blocked:
            raise GuardrailBlockedError(result.blocking_rules)

        redact_matches = sorted(
            [m for m in result.matches if m.action == GuardrailAction.REDACT],
            key=lambda m: m.start, reverse=True,
        )
        seen_end = len(text)
        redacted = text
        for m in redact_matches:
            if m.end > seen_end:
                continue
            replacement = self._get_replacement(m.rule_name)
            redacted = redacted[:m.start] + replacement + redacted[m.end:]
            seen_end = m.start
        return redacted
```

YAML rule file shape:
```yaml
rules:
  - name: aws_access_key
    action: redact
    patterns: ["AKIA[0-9A-Z]{16}"]
    replacement: "[REDACTED:AWS_KEY]"
  - name: forbidden_term
    action: block
    keywords: ["delete production"]
```

## Gotchas
- Keep audit writes best-effort (`OSError` swallowed) — guardrails must never crash the LLM call due to disk failure.
- Module-level singleton `get_guardrail_engine()` caches loaded rules; expose `reset_guardrail_engine()` for hot-reload in tests.
- Apply guardrails to both `system` and `messages` content if your provider separates them (Anthropic does).
- Keyword matching uses lowercase comparison; preserve original case in the replacement so the redaction is visually obvious.
