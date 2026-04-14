# Install skills-hub bootstrap into $HOME\.claude
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$ClaudeDir = if ($env:CLAUDE_DIR) { $env:CLAUDE_DIR } else { "$HOME\.claude" }
$RepoDir = Split-Path -Parent $PSScriptRoot

New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands" | Out-Null
New-Item -ItemType Directory -Force -Path "$ClaudeDir\skills\skills-hub" | Out-Null
New-Item -ItemType Directory -Force -Path "$ClaudeDir\skills-hub" | Out-Null

Write-Host "Installing slash commands -> $ClaudeDir\commands\"
Copy-Item "$RepoDir\bootstrap\commands\*.md" "$ClaudeDir\commands\" -Force

Write-Host "Installing skills-hub skill -> $ClaudeDir\skills\skills-hub\"
Copy-Item "$RepoDir\bootstrap\skills\skills-hub\SKILL.md" "$ClaudeDir\skills\skills-hub\SKILL.md" -Force

if (-not (Test-Path "$ClaudeDir\skills-hub\remote\.git")) {
    Write-Host "Note: runtime remote cache not present at $ClaudeDir\skills-hub\remote\"
    Write-Host "      Either clone the repo there, or a /skills_* command will clone on first run."
}

if (-not (Test-Path "$ClaudeDir\skills-hub\registry.json")) {
    "{}" | Out-File -FilePath "$ClaudeDir\skills-hub\registry.json" -Encoding utf8 -NoNewline
}

Write-Host ""
Write-Host "Done. Installed commands:"
Get-ChildItem "$ClaudeDir\commands\" -Filter "*.md" |
    Where-Object { $_.Name -match "^(init_skills|skills_)" } |
    ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Restart Claude Code to pick up the new slash commands."
