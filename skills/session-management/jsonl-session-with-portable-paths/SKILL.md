---
name: jsonl-session-with-portable-paths
description: Persist agent sessions as JSONL (header on line 1, messages one-per-line) and token-replace absolute session-dir paths so the session file stays portable when moved between machines/dirs.
category: session-management
version: 1.0.0
version_origin: extracted
tags: [session-storage, jsonl, portability, agent-sessions]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/sessions/jsonl.ts
imported_at: 2026-04-18T00:00:00Z
---

# JSONL session storage with portable paths

## When to use
- Long-running agent sessions (hundreds/thousands of messages) where you don't want to re-serialize the whole array on each append.
- Users copy session folders between machines, or the app tracks a sync service - absolute paths embedded in messages break on move.
- Want fast "list sessions" UI: only read line 1 (header) from each file.

## How it works
1. **Layout**: `sessions/<session-id>/session.jsonl`. Line 1 is a JSON `SessionHeader` (id, name, labels, permissionMode, timestamps). Lines 2+ are `StoredMessage` JSON objects, one per line.
2. **Append-only writes**: append a new message = open file, seek to end, write `JSON.stringify(msg) + '\n'`. No full-file rewrite.
3. **Fast header read**: use low-level `fs.openSync` + `fs.readSync` to read JUST the first ~8KB until you hit `\n`, parse as header. `readSessionHeader(file)` returns null if malformed.
4. **Path portability**: before writing any line, run `makeSessionPathPortable(jsonLine, sessionDir)`:
   - Normalize the path, replace all occurrences with `{{SESSION_PATH}}`.
   - On Windows also replace the JSON-escaped (`\\`) variant.
   On read, `expandSessionPath(jsonLine, sessionDir)` reverses it.
5. Mutate only the **header** on UI edits (rename, label change) via copy-rewrite-atomic-rename. Messages never change once written.
6. Permission-mode normalization at read: accept legacy/canonical names, coerce to internal `safe/ask/allow-all` via `parsePermissionMode`.

## Example
```ts
const SESSION_PATH_TOKEN = '{{SESSION_PATH}}';

function makeSessionPathPortable(line: string, dir: string): string {
  const n = normalizePath(dir);
  let out = line.replaceAll(n, SESSION_PATH_TOKEN);
  if (dir !== n) out = out.replaceAll(dir.replaceAll('\\','\\\\'), SESSION_PATH_TOKEN);
  return out;
}
function expandSessionPath(line: string, dir: string): string {
  return line.includes(SESSION_PATH_TOKEN)
    ? line.replaceAll(SESSION_PATH_TOKEN, normalizePath(dir))
    : line;
}

// Append a message
fs.appendFileSync(file, makeSessionPathPortable(JSON.stringify(msg), dir) + '\n');
// Read just the header
function readSessionHeader(file: string): SessionHeader | null {
  const fd = openSync(file, 'r'); const buf = Buffer.alloc(8192);
  const n = readSync(fd, buf, 0, 8192, 0); closeSync(fd);
  const nl = buf.subarray(0, n).indexOf(0x0a);
  return nl < 0 ? null : safeJsonParse(buf.subarray(0, nl).toString('utf8'));
}
```

## Gotchas
- If you ever re-serialize the whole session array, you lose the append-only benefit; audit for code paths that do this.
- Token replacement breaks if a user's session dir happens to equal `{{SESSION_PATH}}` - pick a token unlikely to appear in content.
- Windows paths need the `\\\\` dance because `JSON.stringify` escapes each backslash.
- Header rewrite must be atomic: write `session.jsonl.tmp`, `rename`.
- Don't put volatile metadata (tokenUsage) in the header - every update rewrites the file.
