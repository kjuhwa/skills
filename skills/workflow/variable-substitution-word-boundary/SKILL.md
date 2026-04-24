---
name: variable-substitution-word-boundary
description: Protect `$CONTEXT`/`$BASE_BRANCH`/`$ARGUMENTS` template variables from consuming their prefix inside longer identifiers using `(?![A-Za-z0-9_])` negative-lookahead.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [workflow, templating, regex, variable-substitution]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Word-Boundary Negative Lookahead for Template Variable Replacement

## When to use

- You replace `$CONTEXT`, `$FOO`, `$BASE_BRANCH` placeholders in user-authored prompts / YAML / config.
- A naive `/\$CONTEXT/g` regex replaces the prefix of **longer identifiers**: `$CONTEXTUAL` becomes `<value>UAL`, `$CONTEXT_INFO` becomes `<value>_INFO`. Both are silent bugs.
- `\b` alone isn't enough because `$` is not a word character — the word boundary is *before* the `$`, not after the last letter of the variable name.

## Steps

1. **For each variable, anchor the end with a negative lookahead** that rejects the character classes that can continue a JS/PowerShell-style identifier:

   ```ts
   const CONTEXT_VAR_PATTERN_STR =
     '\\$(?:CONTEXT|EXTERNAL_CONTEXT|ISSUE_CONTEXT)(?![A-Za-z0-9_])';
   ```

   The `(?![A-Za-z0-9_])` at the end means "match only if the next character is not a letter, digit, or underscore." `$CONTEXTUAL` fails the lookahead (next char is `U`, a letter); `$CONTEXT ` succeeds.

2. **Store the pattern as a string constant**, not a RegExp. You'll need to construct **fresh RegExp instances** at each call site because sharing a `/g` regex state (via `lastIndex`) across calls causes non-deterministic matches:

   ```ts
   const hasContextVariables = new RegExp(CONTEXT_VAR_PATTERN_STR).test(result);
   if (hasContextVariables) {
     result = result.replace(new RegExp(CONTEXT_VAR_PATTERN_STR, 'g'), issueContext);
   }
   ```

3. **Keep variables without this risk simple.** `$ARGUMENTS`, `$WORKFLOW_ID`, `$ARTIFACTS_DIR` use plain literal replacement because they don't have ambiguous continuations in practice; but if you ever add `$ARGUMENTS_EXTRA`, you'd need the lookahead on those too.

4. **Document the subset that uses the boundary** so users know which variables tolerate being followed by letters. In Archon only `$CONTEXT`, `$EXTERNAL_CONTEXT`, `$ISSUE_CONTEXT` use the lookahead because they're the ones likeliest to appear in prose that already has `$CONTEXTUAL` as a real word.

## Counter / Caveats

- **Don't use `\b`** after the variable name: `$CONTEXT\b` matches "`$CONTEXT`" because `\b` triggers between the `T` and a space. Looks right but fails for `$CONTEXT_INFO` (underscore is a word char, so no boundary between T and _, fine) and **works** for `$CONTEXT1` (boundary between T and 1? No — both are word chars). The negative lookahead is the correct tool.
- **Order matters only in edge cases.** If both `$CONTEXT` and `$CONTEXT_BLOCK` are valid variables, you must either alternate with the longer one first in the regex or use the lookahead on the shorter one. Archon groups the three synonyms into a single alternation.
- Picking `$` as the sigil is convenient but invites shell-variable confusion. Document whether shell substitution is expected (Archon's script nodes use bash; the shared `substituteWorkflowVariables` runs on raw YAML/markdown **before** shell, so shell-var clashes are avoided at the layer level).
- For an escaped dollar sign (`\$`), handle it in a final pass *after* variable substitution so `\$CONTEXT` stays literal.

## Evidence

- `packages/workflows/src/executor-shared.ts:244-246` — `CONTEXT_VAR_PATTERN_STR` constant with inline comment "used to create fresh regex instances."
- `packages/workflows/src/executor-shared.ts:298-302` — fresh-regex construction at each use-site, with a comment explaining "use fresh regex to avoid lastIndex issues."
- The simpler linear substitution pattern for non-boundary vars at `executor-shared.ts:287-296`: `prompt.replace(/\$WORKFLOW_ID/g, ...)` etc.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
