---
name: computer-use-agent
description: Build an agent that controls a computer (screenshots, clicks, keyboard) using ComputerTool.
category: integration
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [openai-agents, computer-use, automation, computer-tool, rpa]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/tools/computer_use.py, src/agents/computer.py
imported_at: 2026-04-18T00:00:00Z
---

# computer-use-agent

Use `ComputerTool` with a `Computer` implementation to give an agent the ability to take screenshots, click, type, and navigate a computer environment.

## When to apply

Browser automation, desktop GUI testing, or any task requiring interaction with a visual computer interface. Used with models that support computer use (e.g., `computer-use-preview`).

## Core snippet

```python
import asyncio
from agents import Agent, Runner
from agents.tool import ComputerTool
from agents.computer import AsyncComputer

class MyComputer(AsyncComputer):
    async def screenshot(self) -> str:
        """Return base64-encoded PNG screenshot."""
        # Implement using pyautogui, Playwright, etc.
        return take_screenshot_base64()

    async def click(self, x: int, y: int, button: str = "left") -> None:
        """Click at coordinates."""
        pyautogui.click(x, y, button=button)

    async def type(self, text: str) -> None:
        """Type text."""
        pyautogui.write(text)

    async def key(self, key: str) -> None:
        """Press a key combination."""
        pyautogui.hotkey(*key.split("+"))

    @property
    def dimensions(self) -> tuple[int, int]:
        return (1920, 1080)

    @property
    def environment(self) -> str:
        return "mac"  # "windows" | "linux" | "mac"

async def main():
    agent = Agent(
        name="Computer operator",
        instructions="Complete the task using the computer.",
        tools=[ComputerTool(computer=MyComputer())],
        model="computer-use-preview",
    )
    result = await Runner.run(agent, "Open a browser and navigate to python.org")
    print(result.final_output)

asyncio.run(main())
```

## Key notes

- Must implement `AsyncComputer` (or `Computer` for sync); required methods: `screenshot`, `click`, `type`, `key`, `dimensions`, `environment`
- Use models that support computer use (check OpenAI model docs)
- `ComputerTool` handles the low-level protocol; your `Computer` impl handles actual execution
- For sandboxed environments, `SandboxAgent` with `capabilities` may be more appropriate
