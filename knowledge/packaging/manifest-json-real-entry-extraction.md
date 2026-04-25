---
version: 0.1.0-draft
name: manifest-json-real-entry-extraction
summary: When building a derived package format that needs a manifest of upstream assets (with checksums), extract entries from the upstream manifest at build time using a regex anchor rather than hardcoding them; fall back to empty arrays if extraction fails to avoid breaking the build on format changes.
category: packaging
tags: [manifest, checksums, build, electron, json, extraction, upstream, packaging]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Manifest JSON Real Entry Extraction

## Context

When repackaging an upstream application for a new platform, you sometimes need
to provide a manifest of asset files (with their checksums) in a format the app
uses at runtime to locate and verify those assets. The upstream app ships a
manifest for its original platform (e.g., Windows) but not for Linux.

If you hardcode the asset entries in the Linux manifest, you must update them
manually with every upstream release — a maintenance burden and a source of
drift. An automated build that extracts the entries from the upstream manifest
is self-updating.

## Observation

The upstream application distributes a manifest (JSON embedded in the
minified JavaScript bundle) that includes file entries like:

```json
{
  "files": {
    "win32": {
      "x64": [
        { "name": "rootfs.vhdx", "sha256": "abc123...", "size": 1234567890 },
        { "name": "vmlinuz",     "sha256": "def456...", "size": 12345678 }
      ]
    }
  }
}
```

For a Linux port that needs a corresponding `linux` section, the practical
approach is to copy the `win32` entries as the `linux` entries (they may be
identical assets, or the Linux-specific assets may be downloaded separately).

The extraction must:
1. Find the manifest structure using a stable string anchor (e.g., a known
   SHA-256 hash prefix or a nearby property name).
2. Parse out the file entry array via a regex that captures the JSON array.
3. Fall back to `[]` (empty array) if the manifest format changes in a future
   release, preventing a build failure.

## Why it happens

Every upstream release changes the file checksums and potentially the file
list. A hardcoded manifest becomes stale on the first release where any asset
changes. Automated extraction ties the Linux manifest to whatever the upstream
ships, staying current without manual intervention.

The fallback to empty arrays is important because upstream may change the
manifest structure in a future release (e.g., rename fields, restructure
nesting). An empty array causes a graceful no-op (features that need these
files are disabled or download lazily) rather than a crash.

## Practical implication

```js
// In the build script (Node.js inline):
const code = fs.readFileSync('bundle.js', 'utf8');

// Find the manifest by a stable anchor (a known SHA hash prefix or property)
const manifestAnchor = '"files":';
const anchorIdx = code.indexOf(manifestAnchor);

let x64Entries = [];
let arm64Entries = [];

if (anchorIdx !== -1) {
  // Extract the win32 x64 array via regex
  const region = code.substring(anchorIdx, anchorIdx + 10000);
  const x64Match = region.match(/"x64"\s*:\s*(\[[\s\S]*?\])/);
  const arm64Match = region.match(/"arm64"\s*:\s*(\[[\s\S]*?\])/);

  try {
    if (x64Match) x64Entries = JSON.parse(x64Match[1]);
    if (arm64Match) arm64Entries = JSON.parse(arm64Match[1]);
    console.log(`Extracted ${x64Entries.length} x64 entries from manifest`);
  } catch (e) {
    console.warn('Failed to parse manifest entries, using empty arrays:', e.message);
    x64Entries = [];
    arm64Entries = [];
  }
} else {
  console.warn('Manifest anchor not found, using empty arrays');
}

// Inject linux entries using the extracted (or empty) arrays
const linuxSection = `,"linux":{"x64":${JSON.stringify(x64Entries)},"arm64":${JSON.stringify(arm64Entries)}}`;
// Insert at the appropriate point in the bundle...
```

The key principle: **extract real data from upstream, but never fail hard if
the extraction fails** — fall back to a safe empty state.

## Source reference

- `build.sh`: `patch_cowork_linux()` Patch 4 comment — "extracts win32 file
  entries — rootfs.vhdx, vmlinuz, initrd with checksums — and reuses them as
  linux entries; falls back to empty arrays if extraction fails."
- `docs/cowork-linux-handover.md`: Patch 4 status entry — "WORKS (extracts
  win32 file entries... and reuses them as linux entries; falls back to empty
  arrays if extraction fails)."
