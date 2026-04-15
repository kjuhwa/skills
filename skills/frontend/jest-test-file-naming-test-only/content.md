# Template

```ts
import { describe, it, expect } from "@jest/globals";
import fn from "./fn";

describe("fn", () => {
  it("normal: returns mapped value", () => {
    expect(fn([{ id: 1 }])).toEqual({ 1: { id: 1 } });
  });
  it("boundary: empty input → empty output", () => {
    expect(fn([])).toEqual({});
  });
  it("exception: null → throws", () => {
    expect(() => fn(null as any)).toThrow();
  });
});
```

## Counter / Caveats
- `.spec.ts` is **not** discovered by this project's Jest config; renaming a legacy `.spec.ts` to `.test.ts` is the fix, not tweaking `testMatch`.
