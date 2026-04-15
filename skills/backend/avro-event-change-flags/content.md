# Avro event with per-section change flags

## Shape

1. Top-level fields: `actionType` enum (`INSERT | UPDATE | DELETE`), stable `id`, minimum identifying fields (name, parentId, ...).
2. For each logically independent mutable section, add a boolean `<section>Changed` flag: e.g. `parentChanged`, `tagFiltersChanged`, `configurationsChanged`.
3. For collection-valued changes, carry deltas (`addedXxxIds`, `removedXxxIds`) in addition to the full changed list, so consumers can pick cheap vs full replay.
4. Producer computes flags by comparing the pre-image (from DB) with the post-image before publishing; never leave flags unset on UPDATE.
5. Consumers dispatch on `actionType` first, then on the `*Changed` flags; they must tolerate multiple flags true in one event.

## Why this shape

- DELETE carries minimal identifying fields only — payload stays small.
- Consumers that only care about one axis (e.g. permission cache invalidation on `parentChanged`) can short-circuit without deep-diffing.
- Adding a new mutable section is additive: one new flag + fields; existing consumers ignore it.

## Steps

1. Define `actionType` as a closed enum in the `.avsc`.
2. Define `groupType`/entity subtype enum if behavior diverges by subtype.
3. Add one boolean flag per independently mutable section, defaulted to `false`.
4. Add delta arrays for child-collection membership (added/removed), separate from the full change list.
5. In the producer service: load old state → compute flags → build Avro → publish. Never skip flag computation on UPDATE.
6. Document the flag matrix in a short table in the schema's companion markdown.

## Counter / caveats

- Over-fragmenting flags (one flag per field) bloats the schema; group by section that consumers actually branch on.
- Flags are informational, not authoritative — consumers that must be correct under replay should still diff on critical fields.
