---
name: workflow-condition-evaluator
description: Fail-closed evaluator for DAG `when:` expressions supporting `==`/`!=`/`<`/`<=`/`>`/`>=`/`&&`/`||` against prior node outputs with dot-path JSON access.
category: workflow
version: 1.0.0
version_origin: extracted
tags: [workflow, dag, condition, when, fail-closed]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Fail-Closed `when:` Condition Evaluator for DAG Workflows

## When to use

- Your workflow engine has DAG nodes that can reference prior nodes' outputs (`$nodeId.output`).
- You want to write YAML like `when: $classify.output.type == 'BUG'` to conditionally skip nodes, **without** embedding a full JS runtime.
- You need a small, deterministic, testable evaluator whose behavior on malformed input is "skip the node" rather than "throw" or "run anyway".

## Steps

1. **Define the atomic grammar** with one anchored regex so you can't accidentally match substrings:

   ```
   ^\$([a-zA-Z_][a-zA-Z0-9_-]*)\.output(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?\s*(==|!=|<=|>=|<|>)\s*'([^']*)'$
   ```

   This enforces: identifier → `.output` → optional `.field` → operator → **single-quoted** string literal.
2. **Split compound expressions outside quotes.** `||` has lower precedence than `&&`. Write a `splitOutsideQuotes(expr, sep)` helper that tracks whether it is inside `'…'` so `"$a.output == 'a || b' || $c.output == 'x'"` splits correctly.
3. **Evaluate atomically:**
   - For `==` / `!=`: straight string compare (expected value from the regex's quoted group).
   - For `<` / `>` / `<=` / `>=`: `parseFloat` both sides; **if either is not `Number.isFinite`, fail-closed** (return parse-failure to the caller).
4. **Resolve `$nodeId.output[.field]` references** from a `Map<string, NodeOutput>` of **all settled** upstream nodes (completed, failed, **and** skipped). Dot-path access: parse as JSON, pick the field, coerce primitives to string, treat objects/null/undefined as empty string.
5. **Return a two-field result, not just a boolean:** `{ result: boolean, parsed: boolean }`. `parsed: false` means the expression couldn't be matched against the grammar → **skip the node**. Distinguish genuinely-false from unparseable so the DAG executor can surface a warning.
6. **Short-circuit both operators.** OR short-circuits on first `true`; AND short-circuits on first `false`. Any parse failure aborts the entire expression.
7. **Log at debug level** on parse failures and numeric-parse failures, including a 100-char preview of the referenced output when JSON parse fails.

## Counter / Caveats

- **No parentheses, no function calls, no arithmetic.** The grammar is deliberately tiny so nobody can sneak Turing-complete logic into a YAML config. If you need more, write a bash node.
- **Fail-closed on parse failure = skip.** A user who types `when: $foo.output = 'x'` (single `=`) will see the node silently skip, not run. Surface parse failures prominently in your workflow validator before runtime.
- **Only single quotes.** Don't add double-quote support; it invites escaping ambiguity.
- **Outputs must be Map-resolved, not just lookup-by-fallthrough.** If the referenced node doesn't exist, log a warning (`condition_output_ref_unknown_node`) rather than coercing to empty string silently — typos in `$nodeId` are a common user error.
- Referring to `_skipped_` nodes in downstream conditions is intentional (fan-in patterns where "if upstream was skipped, also skip me"). Make sure the node-output map includes skipped outputs.

## Evidence

- `packages/workflows/src/condition-evaluator.ts` (174 lines): full implementation.
- Atom regex at `condition-evaluator.ts:87-88`.
- `splitOutsideQuotes` at `condition-evaluator.ts:64-84`.
- `resolveOutputRef` at `condition-evaluator.ts:31-59` (Map lookup, JSON dot-path access, typed primitive coercion).
- Fail-closed return type `{ result: boolean, parsed: boolean }` at `condition-evaluator.ts:93-104`.
- `condition-evaluator.test.ts` covers precedence, short-circuit, parse failures, numeric coercion.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
