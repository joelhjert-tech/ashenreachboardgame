$ErrorActionPreference = "Stop"

try {
  $currentProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
  if ($null -ne $currentProcess -and $currentProcess.ParentProcessId -gt 0) {
    Write-Output $currentProcess.ParentProcessId
    exit 0
  }
} catch {
  exit 1
}

exit 1
