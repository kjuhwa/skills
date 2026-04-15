# Tiny Regex Lab

> **Why.** Regex debugging is a daily pain, and every online playground is ad-heavy, cloud-hosted, and logs your input. This is a single-file browser tool — no server, no network, per-group color highlighting, a preset library of common patterns, and URL-hash sharing so you can paste a link into chat without a backend.

## Features

- **Live matching** — every keystroke re-runs the regex; matches are highlighted inline in the test string.
- **Per-group colors** — each capture group gets its own color; nested groups layer.
- **Flag toggles** — `g i m s u y` as checkboxes; sane defaults.
- **Match table** — numbered matches, offset, full text, named/numbered groups.
- **Preset library** — email · URL · UUID · semver · IPv4 · ISO date · hex color · slug · JWT.
- **Share link** — the URL hash encodes pattern + flags + test string; copy-and-paste shares the whole session.
- **Error banner** — invalid regex produces a readable error, never a silent blank.
- **Zero deps** — one HTML file. Open with `file://` — no server, no install.

## Usage

```
# Just open the file
open tiny-regex-lab/browser/index.html
# or on Windows
start tiny-regex-lab\browser\index.html
```

## File structure

```
tiny-regex-lab/
├── README.md
├── manifest.json
└── browser/
    └── index.html   # single-file SPA (inline CSS + JS)
```

## Keyboard

- `Ctrl+Enter` in either textarea — force re-run
- `Ctrl+K` — clear pattern + test
- `Ctrl+S` — copy share-link to clipboard
