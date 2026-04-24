---
name: zustand-store-mock-hoisted
description: Mock Zustand stores in Vitest using vi.hoisted() + Object.assign so the mock is both callable as a selector hook AND has .getState() static access.
category: testing
version: 1.0.0
tags: [vitest, zustand, mocking, hoisted]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Testing a React component that consumes a Zustand store both as `useStore(s => s.x)` (subscribe pattern) AND `useStore.getState().y` (imperative access).
- Your shared-package tests mock the Zustand store from an adjacent package.

## Steps

1. Zustand stores are dual-shape: callable function (with selector) AND have static `.getState()` / `.setState()` / `.subscribe()` on them. Plain `vi.fn()` mocks only the callable, breaking `.getState()`.
2. Use `vi.hoisted()` to declare the mock before the `vi.mock()` factory runs:
   ```ts
   import { vi } from "vitest";

   const mocks = vi.hoisted(() => {
     const authState = { user: { id: "u1", name: "Alice" }, token: "t" };
     const useAuthStore = vi.fn((sel: (s: typeof authState) => unknown) => sel(authState));
     Object.assign(useAuthStore, {
       getState: () => authState,
       setState: vi.fn(),
       subscribe: vi.fn(() => () => {}),
     });
     return { useAuthStore, authState };
   });

   vi.mock("@org/core/auth", () => ({
     useAuthStore: mocks.useAuthStore,
   }));
   ```
3. In tests, read the hoisted mock to manipulate state or assert selector calls:
   ```ts
   it("renders user name", () => {
     render(<Header />);
     expect(screen.getByText("Alice")).toBeInTheDocument();
   });

   it("reacts to state change", () => {
     mocks.authState.user = { id: "u2", name: "Bob" };
     // trigger a rerender however the component subscribes...
   });
   ```

## Example

See real usage in `packages/views/` tests that need to mock `@multica/core` stores without pulling in the real store creation code.

## Caveats

- `vi.hoisted` runs before imports, so the factory must not reference any imported symbols.
- For reactive updates in the component under test, you'll still need to trigger a rerender — the mock selector doesn't re-call on state mutation the way Zustand's real subscribe does.
- For multiple related stores (auth, workspace, ui), wrap them all in one `vi.hoisted` block and share via `mocks.*` for clarity.
