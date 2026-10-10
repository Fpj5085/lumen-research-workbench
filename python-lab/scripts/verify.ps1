# Run the python-lab test suite and save the literal output plus exit code.
#
# Usage:
#   .\scripts\verify.ps1
#
# Output goes to .local-verification/ which is ignored by version control.

$ErrorActionPreference = 'Stop'

$labRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $labRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw "Virtual environment not found at $python. Create it first (see README)."
}

$outDir = Join-Path $labRoot '.local-verification'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stdoutPath = Join-Path $outDir 'pytest.stdout.txt'
$stderrPath = Join-Path $outDir 'pytest.stderr.txt'
$summaryPath = Join-Path $outDir 'pytest.summary.txt'

Push-Location $labRoot
try {
    & $python -m pytest -q 1> $stdoutPath 2> $stderrPath
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

$pythonVersion = & $python -c "import sys, platform; print(sys.version.split()[0], platform.platform())"

@(
    "command: $python -m pytest -q"
    "cwd: $labRoot"
    "python: $pythonVersion"
    "exit_code: $exitCode"
) | Set-Content -Path $summaryPath -Encoding utf8

Get-Content -Path $stdoutPath
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0) {
    Write-Host '--- stderr ---'
    Get-Content -Path $stderrPath
}
Write-Host "exit_code=$exitCode"
Write-Host "saved: $summaryPath"

exit $exitCode

