# Install skills-hub bootstrap into $HOME\.claude
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$ClaudeDir = if ($env:CLAUDE_DIR) { $env:CLAUDE_DIR } else { "$HOME\.claude" }
$RepoDir = Split-Path -Parent $PSScriptRoot
$HubDir = Join-Path $ClaudeDir "skills-hub"

New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands"      | Out-Null
New-Item -ItemType Directory -Force -Path "$ClaudeDir\skills\skills-hub" | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir"                  | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\tools"            | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\bin"              | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\indexes"          | Out-Null

Write-Host "Installing slash commands -> $ClaudeDir\commands\"
Copy-Item "$RepoDir\bootstrap\commands\*.md" "$ClaudeDir\commands\" -Force

Write-Host "Installing skills-hub skill -> $ClaudeDir\skills\skills-hub\"
Copy-Item "$RepoDir\bootstrap\skills\skills-hub\SKILL.md" "$ClaudeDir\skills\skills-hub\SKILL.md" -Force

# v2.5.0+: tools / bin / git hooks
if (Test-Path "$RepoDir\bootstrap\tools") {
    Write-Host "Installing tools -> $HubDir\tools\"
    Copy-Item "$RepoDir\bootstrap\tools\*.py" "$HubDir\tools\" -Force
    if (Test-Path "$RepoDir\bootstrap\tools\install-hooks.sh") {
        Copy-Item "$RepoDir\bootstrap\tools\install-hooks.sh" "$HubDir\tools\install-hooks.sh" -Force
    }
}

if (Test-Path "$RepoDir\bootstrap\bin") {
    Write-Host "Installing CLI wrappers -> $HubDir\bin\"
    Get-ChildItem "$RepoDir\bootstrap\bin\" -File |
        Where-Object { $_.Name -like "hub-*" } |
        ForEach-Object { Copy-Item $_.FullName "$HubDir\bin\" -Force }
}

if (-not (Test-Path "$HubDir\remote\.git")) {
    Write-Host "Note: runtime remote cache not present at $HubDir\remote\"
    Write-Host "      Either clone the repo there, or a /skills_* command will clone on first run."
}

if (-not (Test-Path "$HubDir\registry.json")) {
    "{}" | Out-File -FilePath "$HubDir\registry.json" -Encoding utf8 -NoNewline
}

# Install git hooks if remote is ready and a POSIX bash exists.
if ((Test-Path "$HubDir\remote\.git") -and (Test-Path "$HubDir\tools\install-hooks.sh")) {
    $bash = Get-Command bash -ErrorAction SilentlyContinue
    if ($bash) {
        Write-Host "Installing git hooks (auto re-index on merge / commit / checkout)"
        & bash "$HubDir\tools\install-hooks.sh"
    } else {
        Write-Host "Note: bash not found; run 'bash $HubDir/tools/install-hooks.sh' manually to enable hooks."
    }
}

Write-Host ""
Write-Host "To use 'hub-search', 'hub-precheck', 'hub-index-diff' from any shell, add to your PowerShell profile:"
Write-Host "  `$env:Path = `"`$HOME\.claude\skills-hub\bin;`" + `$env:Path"

Write-Host ""
Write-Host "Done. Installed commands:"
Get-ChildItem "$ClaudeDir\commands\" -Filter "*.md" |
    Where-Object { $_.Name -match "^(init_skills|skills_|hub-)" } |
    ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Restart Claude Code to pick up the new slash commands."
