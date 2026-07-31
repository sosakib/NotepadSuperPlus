<#
.SYNOPSIS
    Measures cold-start time of the built Notepad Super Plus executable.

.DESCRIPTION
    Launches the release binary N times and records the interval from process start
    to the main window becoming visible — the point a user would say the app "opened".

    Two numbers matter, and they are not interchangeable (docs/09 §2):
      * in-page (navigation → interactive) — what this codebase controls. Budget 500 ms.
      * total — dominated by Tauri/WebView2 creating the window, ~1 s of which happens
        before the first line of our Rust runs. Ceiling 2000 ms, reported not gated.
    Gate CI on -FailInPageOver; use -FailOver only as a loose sanity ceiling.

    Reports median rather than mean; one antivirus stall should not move the number.

.PARAMETER Runs
    Iterations. Default 7. The first is discarded as a warm-up (file cache, WebView2
    runtime init) — cold-cache numbers are not reproducible enough to regress against.

.PARAMETER FailOver
    Exit 1 if the median *total* exceeds this many milliseconds. Loose by design: the
    total is dominated by Tauri/WebView2 window creation and moves with machine load,
    so a tight gate here is flaky rather than informative.

.PARAMETER FailInPageOver
    Exit 1 if the median *in-page* time (navigation → interactive) exceeds this many
    milliseconds. This is the part the codebase actually controls, and the gate that
    means something. Budget is 500 ms (docs/09 §2).

.EXAMPLE
    powershell -File scripts/bench/startup.ps1
    powershell -File scripts/bench/startup.ps1 -Runs 11 -FailInPageOver 500
#>
[CmdletBinding()]
param(
    [int]$Runs = 7,
    [int]$FailOver = 0,
    [int]$FailInPageOver = 0,
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
$inPages = @()

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
                # Captured before the next -match overwrites $Matches.
                if ($detail -match 'interactive=(\d+)') { $inPages += [int]$Matches[1] }
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

# --- gates -------------------------------------------------------------------
# Two thresholds, deliberately different in character. The in-page number is what
# this codebase controls and is gated tightly; the total is dominated by Tauri and
# WebView2 bringing up a window and moves with machine load, so gating it tightly
# produces flaky failures that teach nobody anything (docs/09 §2).
$failed = $false

if ($FailInPageOver -gt 0) {
    if ($inPages.Count -eq 0) {
        Write-Warning 'no in-page samples captured - is the build instrumented?'
    }
    else {
        $sorted2 = $inPages | Sort-Object
        $inPageMedian = $sorted2[[int]($sorted2.Count / 2)]
        Write-Host ''
        if ($inPageMedian -gt $FailInPageOver) {
            Write-Host ("FAIL  in-page median {0} ms exceeds budget {1} ms" -f $inPageMedian, $FailInPageOver) -ForegroundColor Red
            $failed = $true
        }
        else {
            Write-Host ("PASS  in-page median {0} ms within budget {1} ms" -f $inPageMedian, $FailInPageOver) -ForegroundColor Green
        }
    }
}

if ($FailOver -gt 0) {
    if ($median -gt $FailOver) {
        Write-Host ("FAIL  total median {0} ms exceeds ceiling {1} ms" -f $median, $FailOver) -ForegroundColor Red
        $failed = $true
    }
    else {
        Write-Host ("PASS  total median {0} ms within ceiling {1} ms" -f $median, $FailOver) -ForegroundColor Green
    }
}

if ($failed) { exit 1 }
