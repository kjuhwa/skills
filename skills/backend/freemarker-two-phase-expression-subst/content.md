# FreeMarker Two-Phase Template Substitution

## Problem
User-authored templates contain two *kinds* of variables:
- **Literal substitutions** — `${to_phone_number}`, `${plain_message}` — filled from request context without needing expression evaluation.
- **Expression-bound objects** — `${alarm.threshold}`, `${alarm.detailLink}`, `${alarm.resourceName}` — require a model object.

Feeding everything to FreeMarker in one pass causes escaping pain (XML escape may mangle user message bodies) and order-of-evaluation bugs (literal contains something FreeMarker treats as a directive).

## Pattern
1. **Phase 1 — string replace** the literal placeholders (`content = content.replace("${to_phone_number}", req.phone())` etc.) before touching FreeMarker.
2. **Phase 2 — FreeMarker** `Template.process(model, writer)` with only the expression-object model, not the raw primitives.
3. Disable XML/HTML auto-escape for SMS / JDBC insert channels — the message body is data, not markup.

## Steps
1. Identify which variables are literal-only vs. model-bound. Freeze the list.
2. Write a pre-substitute helper: `preSubstitute(template, Map<String,String>)` with simple `.replace()`.
3. Keep the FreeMarker model objects small — one per expression type (alarm, job, process, report …).
4. Test both phases in isolation: (a) literal pre-sub with special chars `%&<>`, (b) FreeMarker render with null/absent fields.

## Counter / Caveats
- If a literal variable value itself contains `${...}`, phase 2 will re-evaluate it. Escape or document this.
- Don't use this pattern when you only have model-bound expressions — plain FreeMarker is enough.
- XML escape disable is a channel-level choice: enable for email HTML, disable for SMS and JDBC inserts (see `ece284e` — xml ignore fix).
