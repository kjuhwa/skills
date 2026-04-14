# Build Error Triage

## Problem

A build fails with multiple compilation errors. Most of them are **cascades** — follow-on errors caused by an earlier failure. Fixing cascades first wastes time; you may chase errors that vanish once the root cause is patched.

Classic signals:
- `Cannot instantiate the type X` — often because `X` no longer has the expected constructor, or became abstract.
- `The method foo() is undefined for the type Y` — method was renamed, removed, or moved; or `Y` refers to the wrong type.
- `cannot find symbol` — missing import, renamed symbol, or dependency not on classpath.
- `Unresolved compilation problems` (Java) — means the class was loaded despite compile failure; the first line after the marker is usually the root.

## Pattern

1. **Read top-down.** The compiler reports errors in source order. The *first* error is almost always the root.
2. **Classify each error** into one of:
   - **Definition change**: symbol removed/renamed/signature changed.
   - **Dependency change**: artifact missing from classpath, wrong version.
   - **Type change**: class became abstract/interface, generic parameter changed.
   - **Cascade**: error is only possible because of an earlier error.
3. **Fix one root at a time, then rebuild.** Do not batch fixes for multiple unrelated errors — rebuilds often eliminate half of them.
4. **Find the source of truth** for the changed symbol:
   - `git log -p -- path/to/ChangedClass.java` — who renamed/removed it and why.
   - `git blame` on the callsite — when was it last known good.
5. **Decide fix direction**: update callsite to match new API, or revert the definition change. Choose based on commit messages and PR context, not just what's least typing.

## Example

```
Cannot instantiate the type NotificationService
The method isRunning() is undefined for the type TradingApiService
    at WebServer$AnalysisHandler.<init>(WebServer.java:433)
```

**Triage**:
- Error 1: `NotificationService` can't be instantiated — likely became abstract, had its public constructor removed, or now requires parameters.
- Error 2: `isRunning()` undefined on `TradingApiService` — method was renamed or removed.
- Both are **definition changes**. Neither is a cascade of the other.

**Action**:
1. `git log -p src/.../NotificationService.java` — look for recent constructor changes.
2. `git log -p src/.../TradingApiService.java | grep -A3 isRunning` — find rename/removal.
3. At `WebServer.java:433`, update the callsite to the new API (likely `NotificationService.getInstance()` or similar, and the renamed method — commonly `isActive()` or `isStarted()`).
4. Rebuild. Any remaining errors are now independent and can be triaged the same way.

## When to Use

- Build output has ≥2 compilation errors.
- You're tempted to fix errors in the order they appear in the terminal scroll buffer.
- Errors reference classes whose recent history you don't know.

## Pitfalls

- **Don't trust error count.** 20 errors from one missing import are easier than 2 from a genuine API redesign.
- **Don't `@SuppressWarnings` or cast away** a type error without understanding — it often hides a real contract change.
- **IDE error lists reorder** by severity/file. Always cross-check against the raw compiler output for source order.
- **Generated code**: if the error is in a generated file, fix the generator or annotation, not the generated output.
