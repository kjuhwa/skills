---
name: artifact-integration-test-framework-bats
description: Validate .deb, .rpm, and AppImage artifacts after build using BATS. Test file existence, permissions, desktop entry syntax, and module-level Node.js behavior (load a script via node -e with an inline preamble that imports the module under test).
category: testing
version: 1.0.0
tags: [bats, testing, integration-test, deb, rpm, appimage, artifact-validation, node]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Artifact Integration Test Framework (BATS)

## When to use

Use this pattern when:
- You are building Linux packages (`.deb`, `.rpm`, AppImage) and want automated post-build validation before publishing.
- You want to validate that a Node.js script exports the correct interface without executing the full application.
- You want to test path-validation functions, JSON-driven config parsing, or other module-level behavior in isolation using `node -e`.
- You prefer BATS (Bash Automated Testing System) for shell-level artifact tests.

## Pattern

### BATS test structure

```
tests/
  test-artifact-common.sh      # shared setup/teardown helpers
  artifact-deb.bats            # .deb-specific tests
  artifact-rpm.bats            # .rpm-specific tests
  artifact-appimage.bats       # AppImage-specific tests
  module-behavior.bats         # Node.js module tests via node -e preamble
```

### Node.js module test pattern

For testing exported functions from a Node.js script without a test runner:
1. Define a `NODE_PREAMBLE` shell variable with a multiline string.
2. The preamble `require`s the script under test and defines inline `assert` helpers.
3. Each `@test` block runs `node -e "${NODE_PREAMBLE} <test body>"` and checks `$status`.

## Minimal example

```bash
#!/usr/bin/env bats
# tests/module-validate.bats
# Tests for path validation in cowork-like service scripts

SCRIPT_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" && pwd)"

# Inline preamble: load the module under test + assertion helpers
NODE_PREAMBLE='
const path = require("path");
const os = require("os");
const fs = require("fs");

const {
    validateMountPath,
    loadBwrapMountsConfig,
    mergeBwrapArgs,
} = require("'"${SCRIPT_DIR}"'/../scripts/service.js");

function assert(condition, msg) {
    if (!condition) {
        process.stderr.write("ASSERTION FAILED: " + msg + "\n");
        process.exit(1);
    }
}

function assertEqual(actual, expected, msg) {
    assert(actual === expected,
        (msg || "assertEqual") + " expected=" + JSON.stringify(expected) +
        " actual=" + JSON.stringify(actual));
}

function assertDeepEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    assert(a === e, (msg || "assertDeepEqual") + " expected=" + e + " actual=" + a);
}
'

setup() {
    TEST_TMP=$(mktemp -d)
    export TEST_TMP
}

teardown() {
    [[ -n "$TEST_TMP" && -d "$TEST_TMP" ]] && rm -rf "$TEST_TMP"
}

@test "validateMountPath: rejects non-absolute paths" {
    run node -e "${NODE_PREAMBLE}
const result = validateMountPath('relative/path');
assertDeepEqual(result, { valid: false, reason: 'Path must be absolute' }, 'relative');
"
    [[ "$status" -eq 0 ]]
}

@test "validateMountPath: rejects forbidden root path" {
    run node -e "${NODE_PREAMBLE}
const result = validateMountPath('/');
assertEqual(result.valid, false, 'root should be rejected');
"
    [[ "$status" -eq 0 ]]
}

@test "validateMountPath: accepts valid home subdirectory" {
    run node -e "${NODE_PREAMBLE}
const homeSubdir = require('path').join(os.homedir(), 'projects', 'myapp');
const result = validateMountPath(homeSubdir);
assertEqual(result.valid, true, 'home subdir should be valid');
"
    [[ "$status" -eq 0 ]]
}

@test "loadBwrapMountsConfig: returns empty config on missing file" {
    run node -e "${NODE_PREAMBLE}
const result = loadBwrapMountsConfig('/nonexistent/path.json');
assertDeepEqual(result, {
    additionalROBinds: [],
    additionalBinds: [],
    disabledDefaultBinds: []
}, 'missing file should return empty config');
"
    [[ "$status" -eq 0 ]]
}

@test "loadBwrapMountsConfig: loads valid config from temp file" {
    # Write a temp config file
    local config_file="$TEST_TMP/config.json"
    echo '{"preferences":{"sandboxBwrapMounts":{"additionalROBinds":["/usr/local"]}}}' \
        > "$config_file"

    run node -e "${NODE_PREAMBLE}
const result = loadBwrapMountsConfig('${config_file}');
assertEqual(result.additionalROBinds.length, 1, 'should have 1 RO bind');
assertEqual(result.additionalROBinds[0], '/usr/local', 'path should match');
"
    [[ "$status" -eq 0 ]]
}

@test "mergeBwrapArgs: disabled default mount is removed" {
    run node -e "${NODE_PREAMBLE}
const defaultArgs = [
    '--ro-bind', '/usr', '/usr',
    '--ro-bind', '/etc', '/etc',
    '--tmpfs', '/',
];
const config = {
    additionalROBinds: [],
    additionalBinds: [],
    disabledDefaultBinds: ['/usr'],
};
const merged = mergeBwrapArgs(defaultArgs, config);
const hasUsr = merged.some((a, i) => a === '--ro-bind' && merged[i+2] === '/usr');
assert(!hasUsr, '/usr should be disabled');
const hasEtc = merged.some((a, i) => a === '--ro-bind' && merged[i+2] === '/etc');
assert(hasEtc, '/etc should still be present');
"
    [[ "$status" -eq 0 ]]
}
```

### Artifact file existence test (shell-level)

```bash
#!/usr/bin/env bats
# tests/artifact-deb.bats

ARTIFACTS_DIR="${ARTIFACTS_DIR:-./build}"

setup() {
    DEB_FILE=$(find "$ARTIFACTS_DIR" -name "*.deb" -type f | head -1)
    if [[ -z "$DEB_FILE" ]]; then
        skip "No .deb file found in $ARTIFACTS_DIR"
    fi
    EXTRACT_DIR="$(mktemp -d)"
    dpkg-deb -R "$DEB_FILE" "$EXTRACT_DIR"
}

teardown() {
    [[ -n "$EXTRACT_DIR" ]] && rm -rf "$EXTRACT_DIR"
}

@test "deb: launcher script exists and is executable" {
    [[ -x "$EXTRACT_DIR/usr/bin/my-app" ]]
}

@test "deb: app.asar is present" {
    local asar_path="$EXTRACT_DIR/usr/lib/my-app/node_modules/electron/dist/resources/app.asar"
    [[ -f "$asar_path" ]]
}

@test "deb: desktop entry has correct MIME handler" {
    local desktop="$EXTRACT_DIR/usr/share/applications/my-app.desktop"
    grep -q "MimeType=x-scheme-handler/myapp" "$desktop"
}

@test "deb: DEBIAN/control has valid architecture" {
    dpkg-deb --field "$DEB_FILE" Architecture | grep -qE '^(amd64|arm64)$'
}

@test "deb: chrome-sandbox exists (will need setuid after install)" {
    [[ -f "$EXTRACT_DIR/usr/lib/my-app/node_modules/electron/dist/chrome-sandbox" ]]
}
```

## Why this works

### Inline `node -e` preamble for module tests

Node.js module tests via `node -e` avoid needing a test framework like Jest or Mocha in CI. The preamble pattern uses shell variable interpolation (`"${SCRIPT_DIR}"`) to embed the absolute path to the module under test at BATS parse time. This makes the test self-contained — no `npm install` needed for the test runner.

### `process.exit(1)` in assert helpers

BATS checks `$status` (the exit code of `run`). Calling `process.exit(1)` on assertion failure causes the `node` process to exit with code 1, which `run` captures and BATS checks. Using `throw` would also work (`node -e` exits 1 on unhandled exceptions), but explicit `process.exit(1)` with a stderr message gives clearer output.

### `mktemp -d` in setup/teardown

Using `mktemp -d` in `setup()` and `rm -rf` in `teardown()` ensures each test starts with a clean state and leaves no artifacts. BATS runs `setup` before each test and `teardown` after, even if the test fails.

### `skip` on missing artifacts

If the build artifact does not exist (e.g., a test run without a preceding build), `skip "message"` causes BATS to mark the test as skipped rather than failed. This prevents spurious failures in environments where only some artifact types are built.

## Pitfalls

- **`NODE_PREAMBLE` with single quotes and path interpolation** — the preamble is defined with single quotes (`'`...'`) to prevent shell expansion, but you need `'"${SCRIPT_DIR}"'` for the require path. This is the standard shell quoting escape: close single quote, open double quote for expansion, re-open single quote.
- **`assertDeepEqual` via `JSON.stringify`** — this fails for object properties in different order (e.g., `{a:1,b:2}` vs `{b:2,a:1}`). If property order is not guaranteed, use a proper deep-equal check.
- **`dpkg-deb -R` requires `dpkg-dev`** — on minimal CI images, `dpkg-deb` may not be installed. Add it to CI prerequisites or use `skip` if not available.
- **BATS `run` captures stderr separately** — `$output` in BATS contains stdout only. Assertion failure messages written to stderr appear in `$stderr` (BATS v1.5+). Use `echo "# $output" >&3` to print debug output in tests.
- **Absolute paths in `NODE_PREAMBLE`** — if `SCRIPT_DIR` contains spaces or special characters, the embedded path will be malformed. Always test on paths without special characters in CI.

## Source reference

`tests/cowork-bwrap-config.bats`, `tests/cowork-path-translation.bats` — full test implementations using the NODE_PREAMBLE pattern
