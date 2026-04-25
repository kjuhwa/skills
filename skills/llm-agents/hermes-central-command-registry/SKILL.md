---
name: hermes-central-command-registry
description: One CommandDef list feeding CLI dispatch, gateway help, Telegram menu, Slack subcommands, autocomplete.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, cli, slash-commands, single-source-of-truth, registry]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Central Slash-Command Registry for Multi-Surface CLIs

## Context

A conversational agent typically has 30+ slash commands exposed across many surfaces: interactive CLI, messaging gateway, `/help` docs, Telegram BotCommand menu, Slack subcommand map, autocomplete completions, category-grouped help screens. Hardcoding each surface's list separately guarantees drift — a new command will land in CLI dispatch but not in Telegram's menu.

Hermes centralizes all of it in one `COMMAND_REGISTRY` list of `CommandDef` objects, with every consumer deriving automatically.

## When to use

- You have a CLI + any other command surface (Discord bot, Telegram bot, REST, etc.).
- You keep forgetting to update some of those surfaces when you add a command.
- You want aliases to Just Work everywhere without per-surface aliasing code.

## Procedure

### 1. Define a single `CommandDef`

```python
@dataclass(frozen=True)
class CommandDef:
    name: str                       # canonical name without slash ("background")
    description: str
    category: str                   # "Session" | "Configuration" | "Tools & Skills" | "Info" | "Exit"
    aliases: tuple = ()
    args_hint: str = ""             # "<prompt>" | "[name]"
    cli_only: bool = False
    gateway_only: bool = False
    gateway_config_gate: str | None = None  # e.g. "display.tool_progress_command"
```

The `gateway_config_gate` field lets a CLI-only command become available in the gateway only if a config key is truthy — the gateway still registers it so dispatch works, but hides it from help/menus when the gate is closed.

### 2. The one list

```python
COMMAND_REGISTRY = [
    CommandDef("help", "Show commands", "Info", aliases=("h", "?")),
    CommandDef("model", "Switch model", "Configuration", args_hint="[provider:model]"),
    CommandDef("reset", "Clear history", "Session", aliases=("new",)),
    CommandDef("background", "Run in background", "Session",
               aliases=("bg",), args_hint="<prompt>", cli_only=True,
               gateway_config_gate="display.tool_progress_command"),
    # ... ~50 more
]
```

### 3. Derived consumers

From `AGENTS.md` section "Slash Command Registry":

| Consumer | Derivation |
|---|---|
| CLI dispatch | `resolve_command(name_or_alias)` → canonical name; `process_command()` branches on it |
| Gateway dispatch | `GATEWAY_KNOWN_COMMANDS` = frozenset of all gateway-visible names incl. config-gated |
| Gateway `/help` | `gateway_help_lines()` generates lines from definitions where `not cli_only` |
| Telegram | `telegram_bot_commands()` returns `[BotCommand(name, description), ...]` |
| Slack | `slack_subcommand_map()` returns `{name: handler_key, **aliases}` |
| Autocomplete | Flat dict `COMMANDS = {name_or_alias: def, ...}` feeds `SlashCommandCompleter` |
| Category help screen | `COMMANDS_BY_CATEGORY` groups by `category` field |

### 4. Adding a command = 2 file edits, not 7

Per `AGENTS.md`:

> Add a `CommandDef` entry to `COMMAND_REGISTRY`. Add handler in `HermesCLI.process_command()`. If available in the gateway, add a handler in `gateway/run.py`. That's it.

### 5. Adding an alias = 1 tuple edit

Just append to `aliases`. Dispatch, help, Telegram menu, Slack map, and autocomplete all update automatically.

### 6. Config-gated gateway visibility

```python
# CommandDef
CommandDef("toolfeed", "Live tool progress", "Session",
           cli_only=True,
           gateway_config_gate="display.tool_progress_command")

# Dispatch: always registered in GATEWAY_KNOWN_COMMANDS
# Help/menu: shown only when config value is truthy
```

This lets features ship dark, be enabled per-user via config, without branching the command list at startup.

## Pitfalls

- **Don't let individual surface code maintain its own alias map.** You will forget to update one.
- **Beware name collisions with reserved platform commands.** Telegram reserves `/start`, Slack has `/feedback`. Filter `telegram_bot_commands()` / `slack_subcommand_map()` to exclude these.
- **Keep categories short and fixed.** Free-form category strings explode in the help screen.
- **Frozenset vs set for gateway dispatch.** Use frozen so startup-time construction is obviously immutable — you do NOT want dispatch to mutate this under threading.
