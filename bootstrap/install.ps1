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

# v2.6.8+: pre-implementation auto-check block in CLAUDE.md
# Idempotent: inserts on first install, refreshes on re-install.
# Removal is handled by /hub-uninstall.
$claudeMd = Join-Path $ClaudeDir "CLAUDE.md"
$canonicalBlock = @'
<skills_hub>
Before implementing, check the hub for existing skills/knowledge:
- `/hub-find <keyword>` — search installed + remote
- `/hub-install <slug>` — install matching skill/knowledge
- `/hub-list` — see what's already installed
- `/hub-publish` — publish drafts back to the hub
</skills_hub>
'@
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
if (-not (Test-Path $claudeMd)) {
    Write-Host "Creating $claudeMd with <skills_hub> block"
    [System.IO.File]::WriteAllText($claudeMd, $canonicalBlock + "`n", $utf8NoBom)
} else {
    $existing = [System.IO.File]::ReadAllText($claudeMd)
    if ($existing -match '(?s)<skills_hub>.*?</skills_hub>') {
        Write-Host "Refreshing <skills_hub> block in $claudeMd"
        $regex = [regex]'(?s)<skills_hub>.*?</skills_hub>'
        $new = $regex.Replace($existing, { param($m) $canonicalBlock }, 1)
        [System.IO.File]::WriteAllText($claudeMd, $new, $utf8NoBom)
    } else {
        Write-Host "Adding <skills_hub> block to $claudeMd"
        $sep = if ($existing.Length -eq 0) { "" }
               elseif ($existing.EndsWith("`n")) { "`n" }
               else { "`n`n" }
        [System.IO.File]::AppendAllText($claudeMd, $sep + $canonicalBlock + "`n", $utf8NoBom)
    }
}

# v2.6.9+: auto-append bin dir to PowerShell $PROFILE (idempotent).
# Opt out with $env:SKILLS_HUB_NO_PROFILE = "1".
$marker = '# skills-hub:path'
$binLine = '$env:Path = "$HOME\.claude\skills-hub\bin;" + $env:Path  ' + $marker

if ($env:SKILLS_HUB_NO_PROFILE -eq '1') {
    Write-Host ""
    Write-Host "Skipping PowerShell `$PROFILE edit (SKILLS_HUB_NO_PROFILE=1)."
    Write-Host "To enable 'hub-search', 'hub-precheck', 'hub-index-diff' outside Claude Code, add manually:"
    Write-Host "  `$env:Path = `"`$HOME\.claude\skills-hub\bin;`" + `$env:Path"
} else {
    $profilePath = $PROFILE.CurrentUserAllHosts
    $profileDir = Split-Path -Parent $profilePath
    if ($profileDir -and -not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    }
    if (-not (Test-Path $profilePath)) {
        New-Item -ItemType File -Force -Path $profilePath | Out-Null
    }
    $existingProfile = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $existingProfile) { $existingProfile = '' }
    Write-Host ""
    if ($existingProfile -match [regex]::Escape($marker)) {
        Write-Host "PowerShell `$PROFILE already exports skills-hub bin (marker found): $profilePath"
    } else {
        $sep = if ($existingProfile.Length -eq 0 -or $existingProfile.EndsWith("`n")) { "" } else { "`n" }
        Add-Content -Path $profilePath -Value ($sep + $binLine) -Encoding UTF8
        Write-Host "Added skills-hub bin to PowerShell `$PROFILE: $profilePath"
        Write-Host "  Reload with: . `$PROFILE"
    }
    if ($env:Path -notlike "*$HubDir\bin*") {
        $env:Path = "$HubDir\bin;" + $env:Path
    }
}

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
