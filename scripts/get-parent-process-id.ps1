$ErrorActionPreference = "Stop"

try {
  $currentProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
  if ($null -eq $currentProcess -or $currentProcess.ParentProcessId -le 0) {
    exit 1
  }

  # A `for /f (...)` command runs this helper through a short-lived child
  # cmd.exe. The launcher is therefore the parent of that command shell, not
  # PowerShell's immediate parent. Watching the immediate parent makes the
  # server stop as soon as command substitution finishes.
  $commandShell = Get-CimInstance Win32_Process -Filter "ProcessId=$($currentProcess.ParentProcessId)"
  if ($null -ne $commandShell -and $commandShell.ParentProcessId -gt 0) {
    Write-Output $commandShell.ParentProcessId
    exit 0
  }
} catch {
  exit 1
}

exit 1
