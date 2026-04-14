#!/usr/bin/env bash
# Install skills-hub bootstrap into ~/.claude
# Usage: bash install.sh
set -euo pipefail

CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$CLAUDE_DIR/commands" "$CLAUDE_DIR/skills/skills-hub" "$CLAUDE_DIR/skills-hub"

echo "Installing slash commands → $CLAUDE_DIR/commands/"
cp "$REPO_DIR/bootstrap/commands/"*.md "$CLAUDE_DIR/commands/"

echo "Installing skills-hub skill → $CLAUDE_DIR/skills/skills-hub/"
cp "$REPO_DIR/bootstrap/skills/skills-hub/SKILL.md" "$CLAUDE_DIR/skills/skills-hub/SKILL.md"

# Ensure the remote cache symlink / copy exists for the runtime commands
if [ ! -d "$CLAUDE_DIR/skills-hub/remote/.git" ]; then
  echo "Note: runtime remote cache not present at $CLAUDE_DIR/skills-hub/remote/"
  echo "      Either clone the repo there, or a /skills_* command will clone on first run."
fi

# Initialize empty registry if missing
if [ ! -f "$CLAUDE_DIR/skills-hub/registry.json" ]; then
  echo "{}" > "$CLAUDE_DIR/skills-hub/registry.json"
fi

echo ""
echo "Done. Installed commands:"
ls "$CLAUDE_DIR/commands/" | grep -E "^(init_skills|skills_)" | sed 's/^/  /'
echo ""
echo "Restart Claude Code to pick up the new slash commands."
