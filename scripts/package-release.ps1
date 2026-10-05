<#
.SYNOPSIS
    Assembles release/ from the Tauri build output.

.DESCRIPTION
    Everything under release/ is generated and gitignored. This script rebuilds it, so the
    folder can be deleted at any time to reclaim disk without losing anything.

    Steps: build (unless -SkipBuild), collect installers, compute SHA-256 checksums, copy the
    release notes and install guide, and write a manifest.

.PARAMETER SkipBuild
    Package whatever is already in src-tauri/target/release/bundle. Fails if nothing is there.

.PARAMETER Clean
    Delete release/ before packaging.

.EXAMPLE
    powershell -File scripts/package-release.ps1
    powershell -File scripts/package-release.ps1 -SkipBuild -Clean

.NOTES
    Runs on Windows PowerShell 5.1 and PowerShell 7+.
#>
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $repo 'src-tauri\target\release\bundle'
$release = Join-Path $repo 'release'

# Version comes from tauri.conf.json — the manifest the installers are actually stamped with.
$conf = Get-Content (Join-Path $repo 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json
$version = $conf.version
$product = $conf.productName
Write-Host "Packaging $product v$version" -ForegroundColor Cyan

if ($Clean -and (Test-Path $release)) {
    Remove-Item $release -Recurse -Force
    Write-Host '  cleaned release/'
}

if (-not $SkipBuild) {
    Write-Host '  building (this takes a while)...'
    Push-Location $repo
    try {
        pnpm tauri build
        if ($LASTEXITCODE -ne 0) { throw "pnpm tauri build failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
}

if (-not (Test-Path $bundle)) {
    throw "No build output at $bundle. Run without -SkipBuild."
}

foreach ($d in 'installer', 'checksums', 'notes') {
    New-Item -ItemType Directory -Force (Join-Path $release $d) | Out-Null
}

# --- installers ---------------------------------------------------------------
# Tauri never cleans its bundle directory, so artifacts from previous versions sit
# alongside the current ones. Filter by version or the release ships two copies of the
# app at different versions -- which is exactly the kind of thing nobody notices until
# a user downloads the wrong one.
$all = Get-ChildItem $bundle -Recurse -Include *.exe, *.msi
$installers = $all | Where-Object { $_.Name -like "*_${version}_*" }

$stale = $all | Where-Object { $_.Name -notlike "*_${version}_*" }
if ($stale) {
    Write-Warning "Ignoring $($stale.Count) artifact(s) from other versions still in the bundle dir:"
    $stale | ForEach-Object { Write-Warning "    $($_.Name)" }
    Write-Warning "  Delete src-tauri/target/release/bundle to be rid of them."
}

if (-not $installers) {
    throw "No .exe or .msi for version $version under $bundle. Build first, or check the version in tauri.conf.json."
}

$copied = foreach ($f in $installers) {
    # GitHub replaces spaces in asset names with dots on upload. Use that name up front so
    # SHA256SUMS.txt and `sha256sum -c` match the file people actually download.
    $name = $f.Name -replace ' ', '.'
    $dest = Join-Path $release "installer\$name"
    Copy-Item $f.FullName $dest -Force
    Write-Host ("  + {0}  ({1:N1} MB)" -f $name, ($f.Length / 1MB))
    Get-Item $dest
}

# --- checksums ----------------------------------------------------------------
# sha256sum-compatible: "<hash>  <filename>", so `sha256sum -c` verifies it on any platform.
$sumsPath = Join-Path $release 'checksums\SHA256SUMS.txt'
# ASCII, not utf8: Windows PowerShell 5.1 writes a BOM for utf8, and a BOM makes
# `sha256sum -c` reject the first line. Hashes and these filenames are ASCII anyway.
$copied |
    ForEach-Object { "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name } |
    Set-Content $sumsPath -Encoding ascii
Write-Host "  + SHA256SUMS.txt"

# --- notes --------------------------------------------------------------------
foreach ($doc in 'RELEASE_NOTES.md', 'INSTALL.md') {
    $src = Join-Path $repo "docs\$doc"
    if (Test-Path $src) { Copy-Item $src (Join-Path $release "notes\$doc") -Force }
    else { Write-Warning "docs/$doc not found - skipped" }
}
Copy-Item (Join-Path $repo 'LICENSE') (Join-Path $release 'notes\LICENSE') -Force

# --- manifest -----------------------------------------------------------------
$rows = $copied | ForEach-Object {
    "| ``$($_.Name)`` | {0:N1} MB |" -f ($_.Length / 1MB)
}
@"
# $product v$version — release bundle

Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm') by ``scripts/package-release.ps1``.
**This whole folder is generated and gitignored. Delete it freely — rerun the script to rebuild.**

## Contents

| File | Size |
|---|---|
$($rows -join "`n")

- ``checksums/SHA256SUMS.txt`` — verify with ``sha256sum -c SHA256SUMS.txt``, or in PowerShell:
  ``Get-FileHash <file> -Algorithm SHA256``
- ``notes/`` — release notes, install guide, licence

## Publishing

Upload ``installer/*`` and ``checksums/SHA256SUMS.txt`` as GitHub Release assets. Do not commit
them: the repository ignores ``/release/``.

> **Installers are unsigned.** Windows SmartScreen will warn on download until a code-signing
> certificate is purchased and wired into the release workflow.
"@ | Set-Content (Join-Path $release 'README.md') -Encoding utf8

Write-Host "`nrelease/ ready at $release" -ForegroundColor Green
Get-ChildItem $release -Recurse -File | ForEach-Object {
    "  {0}" -f $_.FullName.Substring($release.Length + 1)
}
