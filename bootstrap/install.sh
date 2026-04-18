#!/usr/bin/env bash
# Install skills-hub bootstrap into ~/.claude
# Usage: bash install.sh
set -euo pipefail

CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HUB_DIR="$CLAUDE_DIR/skills-hub"

mkdir -p "$CLAUDE_DIR/commands" "$CLAUDE_DIR/skills/skills-hub" \
         "$HUB_DIR" "$HUB_DIR/tools" "$HUB_DIR/bin" "$HUB_DIR/indexes" \
         "$HUB_DIR/knowledge/api" "$HUB_DIR/knowledge/arch" \
         "$HUB_DIR/knowledge/pitfall" "$HUB_DIR/knowledge/decision" \
         "$HUB_DIR/knowledge/domain" "$HUB_DIR/external"

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

# --- v2.6.4+: shell completion for hub-* bin wrappers ---
if [ -d "$REPO_DIR/bootstrap/completions" ]; then
  echo "Installing shell completions → $HUB_DIR/completions/"
  mkdir -p "$HUB_DIR/completions"
  cp "$REPO_DIR/bootstrap/completions/hub-completion.bash" "$HUB_DIR/completions/" 2>/dev/null || true
  cp "$REPO_DIR/bootstrap/completions/hub-completion.zsh"  "$HUB_DIR/completions/" 2>/dev/null || true
  cp "$REPO_DIR/bootstrap/completions/hub-completion.ps1"  "$HUB_DIR/completions/" 2>/dev/null || true
  cp "$REPO_DIR/bootstrap/completions/README.md"           "$HUB_DIR/completions/README.md" 2>/dev/null || true
fi

# Ensure the remote cache symlink / copy exists for the runtime commands
if [ ! -d "$HUB_DIR/remote/.git" ]; then
  echo "Note: runtime remote cache not present at $HUB_DIR/remote/"
  echo "      Either clone the repo there, or a /skills_* command will clone on first run."
fi

# Initialize / upgrade registry (v2 schema). Handle pre-existing files that
# may carry a UTF-8 BOM from earlier PowerShell installs.
NEED_SEED=0
if [ ! -f "$HUB_DIR/registry.json" ]; then
  NEED_SEED=1
else
  RAW="$(cat "$HUB_DIR/registry.json")"
  RAW="${RAW#$'\xEF\xBB\xBF'}"
  STRIPPED="$(printf '%s' "$RAW" | tr -d '[:space:]')"
  if [ -z "$STRIPPED" ] || [ "$STRIPPED" = "{}" ]; then
    NEED_SEED=1
  fi
fi
if [ "$NEED_SEED" = 1 ]; then
  cat > "$HUB_DIR/registry.json" <<'JSON'
{
  "version": 2,
  "skills": {},
  "knowledge": {}
}
JSON
fi

# Record installed bootstrap version (strip the "bootstrap/" tag prefix).
INSTALLED_VERSION="$(git -C "$REPO_DIR" describe --tags --exact-match --match 'bootstrap/v*' 2>/dev/null \
  || git -C "$REPO_DIR" tag --list 'bootstrap/v*' --sort=-v:refname 2>/dev/null | head -1 \
  || echo 'unknown')"
INSTALLED_VERSION="${INSTALLED_VERSION#bootstrap/}"
INSTALLED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$HUB_DIR/bootstrap.json" <<JSON
{
  "installed_version": "${INSTALLED_VERSION:-unknown}",
  "installed_at": "$INSTALLED_AT"
}
JSON

# Install git hooks if remote is ready
if [ -d "$HUB_DIR/remote/.git" ] && [ -f "$HUB_DIR/tools/install-hooks.sh" ]; then
  echo "Installing git hooks (auto re-index on merge / commit / checkout)"
  bash "$HUB_DIR/tools/install-hooks.sh" || echo "  warn: hook install failed; run manually later"
fi

# Build initial indexes so they exist before the first git hook fires
if [ -f "$HUB_DIR/tools/precheck.py" ]; then
  PYBIN=""
  if command -v py >/dev/null 2>&1; then PYBIN="py -3"
  elif command -v python3 >/dev/null 2>&1; then PYBIN="python3"
  elif command -v python >/dev/null 2>&1; then PYBIN="python"
  fi
  if [ -n "$PYBIN" ]; then
    echo "Building initial indexes"
    PYTHONIOENCODING=utf-8 $PYBIN "$HUB_DIR/tools/precheck.py" --skip-lint >/dev/null 2>&1 \
      || echo "  warn: initial index build failed; run '$PYBIN $HUB_DIR/tools/precheck.py --skip-lint' manually"
  else
    echo "Note: no python found on PATH; skipping initial index build."
  fi
fi

# PATH hint
echo ""
echo "To use 'hub-search', 'hub-precheck', 'hub-index-diff' from any shell, add to ~/.bashrc:"
echo "  export PATH=\"\$HOME/.claude/skills-hub/bin:\$PATH\""

# Completion hint (v2.6.4+)
if [ -d "$HUB_DIR/completions" ]; then
  echo ""
  echo "Optional: tab-completion for hub-* bin wrappers (outside Claude Code)"
  echo "  bash: source \$HOME/.claude/skills-hub/completions/hub-completion.bash"
  echo "  zsh:  source \$HOME/.claude/skills-hub/completions/hub-completion.zsh"
  echo "  (PowerShell has a parallel hub-completion.ps1 — dot-source from \$PROFILE)"
fi

echo ""
echo "Done. Installed commands:"
ls "$CLAUDE_DIR/commands/" | grep -E "^(init_skills|skills_|hub-)" | sed 's/^/  /'
echo ""
echo "Restart Claude Code to pick up the new slash commands."
