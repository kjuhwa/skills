---
version: 0.1.0-draft
name: minified-js-ast-anchor-extraction
summary: When patching minified JavaScript you cannot rely on line numbers or variable names; instead anchor on stable string literals (error messages, log strings, property names) and extract surrounding minified variable names via regex capture groups.
category: electron-packaging
tags: [minification, javascript, regex, patching, anchors, variable-extraction, build]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Minified JS AST Anchor Extraction

## Context

Automated patching of third-party minified JavaScript (e.g., inside an Electron
`.asar` bundle you redistribute) must survive upstream version bumps without
human intervention. Line numbers are unstable (any upstream edit shifts them),
and variable/function names are unstable (minifier renames them each build).
You need a technique that is both precise and durable.

## Observation

String literals embedded in minified code are far more stable across releases
than identifiers or positions:
- **Error messages** (`"Unsupported platform"`, `"VM service not running."`)
  rarely change in wording because they are user-visible or logged.
- **Log strings** (`"vmClient (TypeScript)"`, `"cowork-vm-service"`) are
  intentional identifiers chosen by developers.
- **Object property names** (`"menuBarEnabled"`, `"pop-up-menu"`) map to public
  APIs or configuration keys that are stable by contract.

The technique is:
1. Find the stable string anchor with a simple `grep -F` or `indexOf()`.
2. In the regex that uses the anchor, add a **capture group** that matches the
   surrounding minified identifier (`\w+` or `\$?\w+` for dollar-prefixed names).
3. Store that captured identifier in a shell variable or JS variable.
4. Use the captured identifier in all subsequent patches in the same build
   session.

## Why it happens

Minifiers assign single-letter or short identifiers based on usage frequency
and scope. The same source variable (`isWindows`, `trayManager`) gets a
different short name in each build. The only stable surface is what the
developer deliberately wrote as a string literal or what is part of a public
interface (property names, event names, error messages).

Capture groups in regex turn the "find the stable anchor" step and the
"extract the unstable name next to it" step into one atomic operation.

## Practical implication

**Shell (grep -oP with lookbehind/lookahead):**

```bash
# Extract the function name that is called when menuBarEnabled changes.
# Anchor: the string "menuBarEnabled" inside a known structural pattern.
TRAY_FUNC=$(grep -oP 'on\("menuBarEnabled",\(\)=>\{\K\w+(?=\(\)\})' bundle.js)

# Extract variable name assigned from require("electron")
ELECTRON_VAR=$(grep -oP '\$?\w+(?=\s*=\s*require\("electron"\))' bundle.js | head -1)

# If primary anchor fails, try a structural fallback
if [[ -z "$ELECTRON_VAR" ]]; then
  ELECTRON_VAR=$(grep -oP '(?<=new )\$?\w+(?=\.Tray\b)' bundle.js | head -1)
fi
```

**Node.js (for multi-capture or multi-line cases):**

```js
const code = fs.readFileSync('bundle.js', 'utf8');

// Anchor: known error message string
const anchorIdx = code.indexOf('"VM service not running."');
if (anchorIdx === -1) throw new Error('Anchor not found');

// Extract minified variable name in the ~200 chars before the anchor
const context = code.substring(anchorIdx - 200, anchorIdx);
const varMatch = context.match(/(\$?\w+)\s*\.\s*connect\s*\(/);
if (!varMatch) throw new Error('Variable not found near anchor');
const socketVar = varMatch[1];
```

**Robustness rules:**
- Always check that the extracted variable is non-empty and fail the build
  with a clear error if it is not found, rather than silently producing a
  broken patch.
- Prefer `grep -oP` (Perl regex) over basic grep for reliable lookahead/
  lookbehind.
- Handle dollar-prefixed identifiers (`\$?\w+`) — some minifiers emit `$e`,
  `$t`, etc.
- After applying a patch, verify with a second `grep` that the expected result
  is present (idempotency check).

## Source reference

- `build.sh`: `extract_electron_variable()` — extracting the electron module
  variable name via two fallback patterns.
- `build.sh`: `patch_tray_menu_handler()` — extracting tray function name,
  tray variable name, and first-const variable name via three chained
  anchor-based extractions.
- `build.sh`: `patch_cowork_linux()` — inline Node.js script using
  `code.indexOf(anchor)` + nearby regex capture pattern.
- `CLAUDE.md`: "Extract variable names dynamically" guideline with code example.
