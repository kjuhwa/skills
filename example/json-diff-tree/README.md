# JSON Diff Tree

> **Why.** API response regressions are common, and diffing pretty-printed JSON by eyeball sucks. `jq`-based diffs flatten structure; git diff doesn't understand key reorder. This is a two-pane browser tool: paste two JSON blobs, get a collapsible structural diff with per-path *added / removed / changed* badges, an ignore-key filter, and a one-click *copy as JSON Patch* (RFC 6902) button.

## Features

- **Structural diff** — key-order insensitive, deep.
- **Tree view** — collapsible per node; value peeks inline.
- **Badges** — `+` added · `-` removed · `~` changed · `=` unchanged (toggle-hidden by default).
- **Ignore filter** — comma-separated key names or dotted paths (`updatedAt, meta.requestId`) are excluded from the diff.
- **JSON Patch export** — emits RFC 6902 operations (`add` / `remove` / `replace`) for all non-ignored changes.
- **Swap button** — flip left/right.
- **Zero deps** — single HTML file.

## Usage

```
start json-diff-tree\browser\index.html
```

## File structure

```
json-diff-tree/
├── README.md
├── manifest.json
└── browser/
    └── index.html
```
