---
version: 0.1.0-draft
name: hermes-skin-engine-cli-theming
summary: Data-driven CLI theming — banner colors, spinner faces, branding labels, all via drop-in YAML.
category: reference
tags: [cli, theming, yaml, ux, rich]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# CLI Skin Engine (Data-Driven Theming)

Hermes exposes every visual element of its CLI — banner colors, spinner faces, tool prefix, response box label, agent name — as a pure-data skin. Users drop `~/.hermes/skins/<name>.yaml` and activate with `/skin <name>`. No code changes needed for a new theme.

## Architecture

```
hermes_cli/skin_engine.py      # SkinConfig dataclass, built-ins, YAML loader
~/.hermes/skins/*.yaml         # User-installed custom skins
```

- `init_skin_from_config()` — called at CLI startup, reads `display.skin` from config
- `get_active_skin()` — returns cached `SkinConfig`
- `set_active_skin(name)` — switches skin at runtime (`/skin` command)
- `load_skin(name)` — user skins first, then built-ins, then fallback to `default`
- **Missing values inherit from the default skin automatically** — you only override what you want to change.

## Customizable elements

| Element | Key | Used by |
|---------|-----|---------|
| Banner panel border | `colors.banner_border` | `banner.py` |
| Banner panel title | `colors.banner_title` | `banner.py` |
| Banner section headers | `colors.banner_accent` | `banner.py` |
| Banner dim text | `colors.banner_dim` | `banner.py` |
| Banner body text | `colors.banner_text` | `banner.py` |
| Response box border | `colors.response_border` | `cli.py` |
| Spinner faces (waiting) | `spinner.waiting_faces` | `display.py` |
| Spinner faces (thinking) | `spinner.thinking_faces` | `display.py` |
| Spinner verbs | `spinner.thinking_verbs` | `display.py` |
| Spinner wings | `spinner.wings` | `display.py` |
| Tool output prefix | `tool_prefix` | `display.py` |
| Per-tool emojis | `tool_emojis` | `display.py` → `get_tool_emoji()` |
| Agent name | `branding.agent_name` | `banner.py`, `cli.py` |
| Welcome message | `branding.welcome` | `cli.py` |
| Response box label | `branding.response_label` | `cli.py` |
| Prompt symbol | `branding.prompt_symbol` | `cli.py` |

## Built-in skins

- `default` — Classic Hermes gold/kawaii
- `ares` — Crimson/bronze war-god theme with custom spinner wings
- `mono` — Clean grayscale monochrome
- `slate` — Cool blue developer-focused theme

## User skin example

```yaml
# ~/.hermes/skins/cyberpunk.yaml
name: cyberpunk
description: Neon-soaked terminal theme

colors:
  banner_border: "#FF00FF"
  banner_title: "#00FFFF"
  banner_accent: "#FF1493"

spinner:
  thinking_verbs: ["jacking in", "decrypting", "uploading"]
  wings:
    - ["⟨⚡", "⚡⟩"]

branding:
  agent_name: "Cyber Agent"
  response_label: " ⚡ Cyber "

tool_prefix: "▏"
```

Activate with `/skin cyberpunk` or `display.skin: cyberpunk` in config.yaml.

## Why this shape

- **Pure data.** Users can share YAML files without code review. Zero install friction.
- **Inheritance from default.** A skin listing only `thinking_verbs` and inheriting everything else is a valid skin. Keeps files tiny.
- **Runtime switchable.** `/skin <name>` updates the cached config without restart — useful for A/B testing themes on a live agent.

## Integration: diff display honors skin colors

`agent/display.py` resolves diff colors (minus/plus backgrounds, dim, hunk) from the active skin so unified diffs rendered after file edits look consistent with the rest of the UI. The resolution is lazy and cached, so skins can be switched without reopening the transcript.

## Reference

- `hermes_cli/skin_engine.py` — `SkinConfig`, built-ins, loader
- `hermes_cli/banner.py` — banner rendering
- `agent/display.py:32-77` — diff color resolution from skin
- `AGENTS.md` "Skin/Theme System" section
