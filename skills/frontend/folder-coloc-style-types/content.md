# Why

- Co-located files make a component reviewable as a unit.
- Subfolders like `styles/` create an extra indirection that breaks `Go to file` flow and inflates import paths.
- A single `types.ts` per folder prevents the ad-hoc `FooTypes.ts` + `BarTypes.ts` sprawl.
