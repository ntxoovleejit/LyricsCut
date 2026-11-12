$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root '.venv\Scripts\python.exe'
$server = Join-Path $root 'server.py'
$model = Join-Path $root 'models\faster-whisper-large-v3\model.bin'
if (!(Test-Path $python) -or !(Test-Path $model)) { exit 1 }
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 2
  if ($health.status -eq 'ready' -and [int]$health.api_version -ge 5) { exit 0 }
  $listener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -and $process.CommandLine.Contains($server)) {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    } else {
      exit 1
    }
  }
} catch {}
Start-Process -FilePath $python -ArgumentList @($server) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'server.log') -RedirectStandardError (Join-Path $root 'server-error.log')
