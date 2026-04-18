# Install skills-hub bootstrap into $HOME\.claude
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$ClaudeDir = if ($env:CLAUDE_DIR) { $env:CLAUDE_DIR } else { "$HOME\.claude" }
$RepoDir = Split-Path -Parent $PSScriptRoot
$HubDir = Join-Path $ClaudeDir "skills-hub"

New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands"        | Out-Null
New-Item -ItemType Directory -Force -Path "$ClaudeDir\skills\skills-hub" | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir"                    | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\tools"              | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\bin"                | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\indexes"            | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\knowledge\api"      | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\knowledge\arch"     | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\knowledge\pitfall"  | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\knowledge\decision" | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\knowledge\domain"   | Out-Null
New-Item -ItemType Directory -Force -Path "$HubDir\external"           | Out-Null

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

# v2.6.4+: shell completion for hub-* bin wrappers
if (Test-Path "$RepoDir\bootstrap\completions") {
    Write-Host "Installing shell completions -> $HubDir\completions\"
    New-Item -ItemType Directory -Force -Path "$HubDir\completions" | Out-Null
    Copy-Item "$RepoDir\bootstrap\completions\hub-completion.bash" "$HubDir\completions\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$RepoDir\bootstrap\completions\hub-completion.zsh"  "$HubDir\completions\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$RepoDir\bootstrap\completions\hub-completion.ps1"  "$HubDir\completions\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$RepoDir\bootstrap\completions\README.md"           "$HubDir\completions\README.md" -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path "$HubDir\remote\.git")) {
    Write-Host "Note: runtime remote cache not present at $HubDir\remote\"
    Write-Host "      Either clone the repo there, or a /skills_* command will clone on first run."
}

# Initialize / upgrade registry (v2 schema). Strip a possible UTF-8 BOM
# written by earlier installs before deciding whether to re-seed.
$needSeed = $false
if (-not (Test-Path "$HubDir\registry.json")) {
    $needSeed = $true
} else {
    $existing = Get-Content "$HubDir\registry.json" -Raw -ErrorAction SilentlyContinue
    if ($null -eq $existing) { $existing = '' }
    $existing = $existing.TrimStart([char]0xFEFF)
    $existing = ($existing -replace '\s','')
    if ([string]::IsNullOrEmpty($existing) -or $existing -eq '{}') { $needSeed = $true }
}
if ($needSeed) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText("$HubDir\registry.json", @'
{
  "version": 2,
  "skills": {},
  "knowledge": {}
}
'@, $utf8NoBom)
}

# Record installed bootstrap version (strip the "bootstrap/" tag prefix).
$installedVersion = $null
try {
    $installedVersion = (& git -C "$RepoDir" describe --tags --exact-match --match 'bootstrap/v*' 2>$null).Trim()
} catch {}
if (-not $installedVersion) {
    try {
        $installedVersion = ((& git -C "$RepoDir" tag --list 'bootstrap/v*' --sort=-v:refname 2>$null) | Select-Object -First 1).Trim()
    } catch {}
}
if (-not $installedVersion) { $installedVersion = "unknown" }
$installedVersion = $installedVersion -replace '^bootstrap/',''
$installedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$HubDir\bootstrap.json", @"
{
  "installed_version": "$installedVersion",
  "installed_at": "$installedAt"
}
"@, $utf8NoBom)

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

# Build initial indexes so they exist before the first git hook fires
if (Test-Path "$HubDir\tools\precheck.py") {
    $pyBin = $null
    if (Get-Command py -ErrorAction SilentlyContinue)      { $pyBin = @("py","-3") }
    elseif (Get-Command python3 -ErrorAction SilentlyContinue) { $pyBin = @("python3") }
    elseif (Get-Command python  -ErrorAction SilentlyContinue) { $pyBin = @("python") }
    if ($pyBin) {
        Write-Host "Building initial indexes"
        $env:PYTHONIOENCODING = "utf-8"
        & $pyBin[0] @($pyBin[1..($pyBin.Length-1)] + @("$HubDir\tools\precheck.py","--skip-lint")) *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  warn: initial index build failed; run '$($pyBin -join ' ') $HubDir\tools\precheck.py --skip-lint' manually"
        }
    } else {
        Write-Host "Note: no python found on PATH; skipping initial index build."
    }
}

Write-Host ""
Write-Host "To use 'hub-search', 'hub-precheck', 'hub-index-diff' from any shell, add to your PowerShell profile:"
Write-Host "  `$env:Path = `"`$HOME\.claude\skills-hub\bin;`" + `$env:Path"

# v2.6.4+: completion hint
if (Test-Path "$HubDir\completions") {
    Write-Host ""
    Write-Host "Optional: tab-completion for hub-* bin wrappers (outside Claude Code)"
    Write-Host "  PowerShell: . `$HOME\.claude\skills-hub\completions\hub-completion.ps1"
    Write-Host "  bash/zsh:   source `$HOME/.claude/skills-hub/completions/hub-completion.{bash,zsh}"
}

Write-Host ""
Write-Host "Done. Installed commands:"
Get-ChildItem "$ClaudeDir\commands\" -Filter "*.md" |
    Where-Object { $_.Name -match "^(init_skills|skills_|hub-)" } |
    ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Restart Claude Code to pick up the new slash commands."
