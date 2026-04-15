# MongoDB AND/OR Criteria Composition with elemMatch

## Problem

You need to translate user-authored filter rows (e.g. `tagKey OP value` with an AND/OR between each row) into a single Spring Data MongoDB `Criteria`, while the target field is an **array of `{key, value}` subdocuments**. Naive chaining produces wrong precedence.

## Shape

1. Walk the filter rows in order.
2. Keep two structures:
   - `current` — the AND group currently being accumulated (`List<Criteria>`).
   - `stack` (Deque) — completed AND groups awaiting OR combination.
3. On encountering `OR` between rows: push `current` onto the stack, start a new `current`.
4. Build each atomic criterion as `Criteria.where(ARRAY_FIELD).elemMatch(Criteria.where(KEY_FIELD).is(key).and(VALUE_FIELD).<op>(value))`.
5. At the end: push last `current`. If stack has >1 group → `new Criteria().orOperator(groupAnd[])`. Otherwise `andOperator(group)`.

## Supported operators

- `=` → `.is(value)`
- `!=` → `.ne(value)`
- `LIKE` → `.regex(Pattern.quote(value))`
- `NOT_LIKE` → `.not().regex(...)`

Use a single `switch` over the operator enum to build the per-row Criteria.

## Why elemMatch

Without `elemMatch`, `where("tags.key").is(k).and("tags.value").is(v)` matches documents where *some* element has key=k and *some* element has value=v — not necessarily the same element. `elemMatch` scopes both predicates to the same array element.

## Pitfalls

- Do not forget to flush the last `current` group onto the stack before combining.
- Always wrap LIKE values with `Pattern.quote` unless wildcard semantics are intended — otherwise user input becomes regex.
- A single filter row should still go through the same code path (empty stack → return the single criterion).
- Reuse a single `Deque<List<Criteria>>` rather than recursion; it reads more clearly for analysts.

## Reference implementation

`src/main/java/.../common/CriteriaMaker.java` in lucida-performance (`CriteriaMakerTest` exercises mixed AND/OR and LIKE cases).
