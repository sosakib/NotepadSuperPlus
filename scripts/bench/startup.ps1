<#
.SYNOPSIS
    Measures cold-start time of the built Notepad Super Plus executable.

.DESCRIPTION
    Launches the release binary N times and records the interval from process start
    to the main window becoming visible — the point a user would say the app "opened".

    Budget is < 500 ms (docs/09_Performance_Strategy.md §2). This script is the
    regression guard for it: -FailOver makes it exit non-zero above a threshold, so
    it can gate CI.

    Reports median rather than mean; one antivirus stall should not move the number.

.PARAMETER Runs
    Iterations. Default 7. The first is discarded as a warm-up (file cache, WebView2
    runtime init) — cold-cache numbers are not reproducible enough to regress against.

.PARAMETER FailOver
    Exit 1 if the median exceeds this many milliseconds.

.EXAMPLE
    powershell -File scripts/bench/startup.ps1
    powershell -File scripts/bench/startup.ps1 -Runs 11 -FailOver 500
#>
[CmdletBinding()]
param(
    [int]$Runs = 7,
    [int]$FailOver = 0,
    [string]$Exe
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $Exe) { $Exe = Join-Path $repo 'src-tauri\target\release\notepad-super-plus.exe' }

if (-not (Test-Path $Exe)) {
    throw "Not found: $Exe`nBuild first: pnpm tauri build"
}

Write-Host "Cold start - $(Split-Path -Leaf $Exe)" -ForegroundColor Cyan
Write-Host "  $Runs runs (first discarded as warm-up)`n"

$samples = @()
$shells = @()

for ($i = 1; $i -le $Runs; $i++) {
    # A stale instance would be handed the launch by single-instance forwarding and
    # the new process would exit immediately, producing a meaningless 20 ms sample.
    Get-Process -Name 'notepad-super-plus' -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Kill(); [void]$_.WaitForExit(5000) }
    Start-Sleep -Milliseconds 400

    # The app writes its own launch->interactive time here. Measuring from outside
    # does not work: MainWindowHandle is non-zero long before WebView2 paints, which
    # reports ~40 ms for a window that shows nothing yet.
    $marker = Join-Path ([System.IO.Path]::GetTempPath()) "nsp-bench-$([guid]::NewGuid()).txt"
    $env:NSP_BENCH_OUT = $marker

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $p = Start-Process $Exe -PassThru

    $ms = $null
    $detail = ''
    while ($sw.ElapsedMilliseconds -lt 30000) {
        if (Test-Path $marker) {
            $raw = (Get-Content $marker -Raw -ErrorAction SilentlyContinue)
            if ($raw -and $raw.Trim() -match '^(\d+)(\s+.*)?$') {
                $ms = [int]$Matches[1]
                $detail = if ($Matches[2]) { $Matches[2].Trim() } else { '' }
                if ($detail -match 'shell=(\d+)') { $shells += [int]$Matches[1] }
                break
            }
        }
        if ($p.HasExited) { break }
        Start-Sleep -Milliseconds 2
    }
    $sw.Stop()

    if ($null -eq $ms) {
        Write-Warning "  run $i - no readiness marker within 30 s (exited: $($p.HasExited))"
    }
    else {
        $tag = if ($i -eq 1) { ' (warm-up, discarded)' } else { $samples += $ms; '' }
        Write-Host ("  run {0,-2} {1,6} ms  {2}{3}" -f $i, $ms, $detail, $tag)
    }

    if (-not $p.HasExited) { $p.Kill(); [void]$p.WaitForExit(5000) }
    Remove-Item $marker -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 200
}

if ($samples.Count -eq 0) { throw 'No successful runs.' }

$sorted = $samples | Sort-Object
$median = if ($sorted.Count % 2) { $sorted[[int]($sorted.Count / 2)] }
          else { [math]::Round(($sorted[$sorted.Count / 2 - 1] + $sorted[$sorted.Count / 2]) / 2) }

Write-Host ''
Write-Host ("  median  {0} ms" -f $median) -ForegroundColor Green
Write-Host ("  min/max {0} / {1} ms" -f $sorted[0], $sorted[-1])
Write-Host ("  n       {0}" -f $sorted.Count)

if ($shells.Count -gt 0) {
    $sh = ($shells | Sort-Object)[[int]($shells.Count / 2)]
    Write-Host ''
    Write-Host ("  of which shell (process + WebView2 boot): ~{0} ms" -f $sh) -ForegroundColor DarkGray
    Write-Host ("  reachable by frontend work:               ~{0} ms" -f ($median - $sh)) -ForegroundColor DarkGray
}

if ($FailOver -gt 0) {
    if ($median -gt $FailOver) {
        Write-Host ''
        Write-Host ("FAIL  median {0} ms exceeds budget {1} ms" -f $median, $FailOver) -ForegroundColor Red
        exit 1
    }
    Write-Host ("PASS  median {0} ms within budget {1} ms" -f $median, $FailOver) -ForegroundColor Green
}
