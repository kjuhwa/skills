#!/usr/bin/env bash
# Install skills-hub bootstrap into ~/.claude
# Usage: bash install.sh
set -euo pipefail

CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HUB_DIR="$CLAUDE_DIR/skills-hub"

mkdir -p "$CLAUDE_DIR/commands" "$CLAUDE_DIR/skills/skills-hub" \
         "$HUB_DIR" "$HUB_DIR/tools" "$HUB_DIR/bin" "$HUB_DIR/indexes"

echo "Installing slash commands → $CLAUDE_DIR/commands/"
cp "$REPO_DIR/bootstrap/commands/"*.md "$CLAUDE_DIR/commands/"

echo "Installing skills-hub skill → $CLAUDE_DIR/skills/skills-hub/"
cp "$REPO_DIR/bootstrap/skills/skills-hub/SKILL.md" "$CLAUDE_DIR/skills/skills-hub/SKILL.md"

# --- NEW in v2.5.0: ship the local index/tools/bin layer ---
if [ -d "$REPO_DIR/bootstrap/tools" ]; then
  echo "Installing tools → $HUB_DIR/tools/"
  cp "$REPO_DIR/bootstrap/tools/"*.py "$HUB_DIR/tools/"
  if [ -f "$REPO_DIR/bootstrap/tools/install-hooks.sh" ]; then
    cp "$REPO_DIR/bootstrap/tools/install-hooks.sh" "$HUB_DIR/tools/install-hooks.sh"
    chmod +x "$HUB_DIR/tools/install-hooks.sh"
  fi
fi

if [ -d "$REPO_DIR/bootstrap/bin" ]; then
  echo "Installing CLI wrappers → $HUB_DIR/bin/"
  cp "$REPO_DIR/bootstrap/bin/"hub-* "$HUB_DIR/bin/" 2>/dev/null || true
  chmod +x "$HUB_DIR/bin/"hub-* 2>/dev/null || true
fi

# Ensure the remote cache symlink / copy exists for the runtime commands
if [ ! -d "$HUB_DIR/remote/.git" ]; then
  echo "Note: runtime remote cache not present at $HUB_DIR/remote/"
  echo "      Either clone the repo there, or a /skills_* command will clone on first run."
fi

# Initialize empty registry if missing
if [ ! -f "$HUB_DIR/registry.json" ]; then
  echo "{}" > "$HUB_DIR/registry.json"
fi

# Install git hooks if remote is ready
if [ -d "$HUB_DIR/remote/.git" ] && [ -f "$HUB_DIR/tools/install-hooks.sh" ]; then
  echo "Installing git hooks (auto re-index on merge / commit / checkout)"
  bash "$HUB_DIR/tools/install-hooks.sh" || echo "  warn: hook install failed; run manually later"
fi

# PATH hint
echo ""
echo "To use 'hub-search', 'hub-precheck', 'hub-index-diff' from any shell, add to ~/.bashrc:"
echo "  export PATH=\"\$HOME/.claude/skills-hub/bin:\$PATH\""

echo ""
echo "Done. Installed commands:"
ls "$CLAUDE_DIR/commands/" | grep -E "^(init_skills|skills_|hub-)" | sed 's/^/  /'
echo ""
echo "Restart Claude Code to pick up the new slash commands."
