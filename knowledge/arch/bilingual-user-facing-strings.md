---
version: 0.1.0-draft
name: bilingual-user-facing-strings
summary: A bilingual_str struct carrying both original and translated forms lets GUI show translated text while logs/stderr keep the original — no locale branching in business code.
category: arch
tags: [cpp, i18n, localization, logging, ui]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# Bilingual user-facing strings

## The rule

Represent every user-visible message as a struct with two fields: `original` (English, fixed) and `translated` (localized, resolved at runtime). Business code builds `bilingual_str` values; presenters decide which field to display.

## Why

A single string type forces every caller to either (a) translate early and log localized text no support engineer can read, or (b) translate late and duplicate message construction. The bilingual pair resolves this:

- Logs, stderr, crash reports, and wire protocols use `.original` — support can grep them across languages.
- GUI uses `.translated` — users see their own language.
- No call site has to know which surface it's feeding. The presenter decides.

Marking strings with a `_()` macro (`TranslatedLiteral` in this codebase) at the construction site lets translator tooling extract them without parsing code. `consteval` on the macro means translations are validated at compile time.

## How to apply

- Any message that *could* reach a user goes through `bilingual_str`.
- Messages that stay internal (debug logs, metrics labels) stay `std::string` — don't overpay.
- Translation resolution is pluggable (`TranslateFn` callback); the default in tests is identity, so unit tests don't care.

## Evidence

- `src/util/translation.h`
- `src/util/result.h`
