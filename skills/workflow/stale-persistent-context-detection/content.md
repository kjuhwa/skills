# Stale Persistent-Context Detection

## Problem

LLM coding tools inject persistent context into every session from files such as `CLAUDE.md`, `AGENTS.md`, project memory, or a system prompt configured in the IDE. A stack trace or error log pasted there weeks ago keeps reappearing as if it were current. Acting on it leads to:

- Fixing an error that is already fixed in source.
- Editing files that don't contain the problem.
- Confusion when the "reported" file paths don't match the actual codebase.

Signals that an in-context error may be stale:
- The error references symbols/line numbers that no longer exist in current source.
- The referenced project lives in a different directory than the current `cwd`.
- The error block sits under a "migrated from previous session" / "user customizations" header.
- The block has no timestamp, commit SHA, or link to a live issue.
- The error reappears in a fresh session with no new build having been run.

## Pattern

**Verify before you fix.** Run this protocol whenever injected context reports a compile/runtime error.

### 1. Locate the source of truth for each symbol

For every class/method named in the error, search the **current** codebase:

```bash
# Is the symbol even in this project?
rg --files-with-matches "class NotificationService|interface NotificationService"

# Is the method that "doesn't exist" actually present?
rg "public\s+(boolean|void)\s+isRunning\s*\("
```

### 2. Disambiguate: wrong directory vs stale context

Use the symbol-search result to pick a branch:

| Search result | Diagnosis | Action |
|---|---|---|
| Symbol not in current project, **but exists elsewhere on disk** | **Wrong `cwd`** — user is pointing you at the wrong project | Ask user for correct path; switch, don't edit context |
| Symbol not in current project, **doesn't exist anywhere searchable** | **Stale context** — error is from a repo you no longer have | Proceed to step 5 cleanup |
| Symbol exists in current project, line numbers / signatures disagree with error | **Stale context** — source moved forward | Verify with build (step 4), then cleanup |
| Symbol exists and matches the error exactly | **Real current bug** | Stop this protocol; actually fix the code |

### 3. Check line numbers as a cheap signal

The error has `File.java:433` but line 433 of the current file is an unrelated method → the file has been refactored since the error was captured. Strong signal of staleness, but not decisive on its own (see step 4).

### 4. Check git state before declaring stale

Before concluding "already fixed", verify you're comparing against the *right* snapshot:

```bash
git status -sb              # uncommitted changes?
git rev-parse --abbrev-ref HEAD  # current branch — is it the one the error came from?
git stash list              # stashed WIP that might reintroduce the symbol?
```

If working copy is dirty or on a different branch, the symbol might be "missing" only in your current view. Note this explicitly before moving on.

### 5. Run the actual build

The decisive check:

```bash
mvn -q compile             # Maven
./gradlew compileJava      # Gradle
cargo check                # Rust
tsc --noEmit               # TypeScript
go build ./...             # Go
```

Exit 0 on a clean compile = the reported compile error is a ghost. Source is fine *right now* on this branch.

### 6. Cleanup — show first, then edit

If verified stale, remove the block from the persistent-context file so it stops polluting future sessions. **Never silent-edit.**

1. Read the context file, locate the exact line range of the stale block.
2. **Show the block to the user** with line numbers.
3. Ask explicitly: "remove lines N–M from `<path>`?"
4. On confirmation, apply a targeted edit (not a rewrite).
5. Re-read the file and confirm only the intended lines were removed.

Typical paths (adapt to your tool):
```
~/.claude/CLAUDE.md
~/.claude/memory/*.md
./AGENTS.md
./CLAUDE.md
<IDE system-prompt settings>
```

Leaving the stale block means every future session wastes tokens on it and future-you will be tempted to fix it again.

## Example

```
// Injected into context every session:
Exception in thread "main" java.lang.Error: Unresolved compilation problems:
    Cannot instantiate the type NotificationService
    The method isRunning() is undefined for the type TradingApiService
        at com.foo.web.WebServer$AnalysisHandler.<init>(WebServer.java:433)
```

Verification run:
- `rg "class AnalysisHandler"` → found at `WebServer.java:683`, not `:433`. **Line number mismatch.**
- `rg "new NotificationService\\("` → zero hits; callsites use `CompositeNotification.createDefault()` instead. **Error already fixed.**
- `rg "public boolean isRunning"` in `TradingApiService.java` → found at `:2168`. **Method exists.**
- `git status -sb` → clean, on `main`. Branch matches what user was running.
- `mvn -q compile` → exit 0. **Clean build.**

Conclusion: stale. Show user the 10-line block in `CLAUDE.md` → confirm → remove.

## When to Use

- User reports an error that surfaced via persistent context, not via a fresh run.
- The error message references absolute paths, line numbers, or symbols you haven't touched this session.
- The current `cwd` doesn't contain the referenced files.
- Before writing a single line of "fix" for an error that appeared without the user re-running anything.

## Pitfalls

- **Don't silently ignore the block.** Flag it to the user explicitly — they may be relying on you to catch these.
- **Don't delete the block without showing it first.** The user may want to keep it (as a reminder of past work, or it may be current after all).
- **Don't assume stale just because paths look weird.** A Windows path mixed with Unix separators isn't necessarily stale — verify with grep and build.
- **Don't confuse "stale context" with "wrong project directory"**. Use the table in step 2: symbol exists elsewhere on disk → wrong `cwd`; symbol exists nowhere → stale.
- **Don't skip the git state check.** A dirty working copy or different branch can make a current bug look stale.
- **Re-read after cleanup.** Confirm you removed exactly the intended lines, no more, no less.
- **Don't edit project-shared `CLAUDE.md` or `AGENTS.md` without extra care** — those changes commit and affect teammates. User-scoped `~/.claude/CLAUDE.md` is safer to prune.
