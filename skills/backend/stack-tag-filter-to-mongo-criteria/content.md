# Stack-based tag-filter parser → MongoDB Criteria

## Input shape

Token list from UI, e.g.:

```
["confType = server", "AND", "env = prod", "OR", "(", "role = db", "AND", "tier = primary", ")"]
```

Tokens are one of: leaf (`"key = value"`), `AND`, `OR`, `(`, `)`.

## Algorithm (shunting-yard variant)

1. Two stacks: `operandStack` (Criteria) and `operatorStack` (AND/OR/paren).
2. Iterate tokens:
   - Leaf → parse `key = value` → build `Criteria.where("tags").elemMatch(Criteria.where("key").is(k).and("value").is(v))` → push to operandStack.
   - `(` → push to operatorStack.
   - `)` → pop operators until `(`; for each popped op, pop two operands, combine via `new Criteria().andOperator(a,b)` / `.orOperator(a,b)`, push result.
   - `AND`/`OR` → while top of operatorStack has equal-or-higher precedence AND is not `(`, reduce as above; then push current.
3. End of input: reduce until operatorStack empty.
4. Result is a single Criteria; wrap in an aggregation `$match` or a `find` query.

## Precedence

`AND` higher than `OR`. Parens override.

## Why elemMatch

Tags are stored as an array of `{key, value}` sub-documents. A naive `tags.key = k AND tags.value = v` matches across DIFFERENT elements of the array and yields false positives. `elemMatch` pins both conditions to the same array element.

## Steps

1. Define a `TagFilterParser` with `parse(List<String> tokens): Criteria`.
2. Unit-test with: single leaf, AND chain, OR chain, mixed with parens, mismatched parens (should throw), empty input.
3. Cache the parsed Criteria only if tokens are content-addressed; otherwise re-parse per query (parser is cheap).

## Counter / caveats

- Don't eval-exec the expression as code — it's untrusted input.
- Parse errors must return a domain error, not a 500.
- If value can contain `=`, split on the first `=` only.
- Numeric/date values need type coercion before `.is(...)` — decide schema-per-key.
