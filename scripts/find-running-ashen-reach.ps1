param(
  [Parameter(Mandatory = $true)]
  [string]$RepositoryRoot
)

$ErrorActionPreference = "Stop"

try {
  $resolvedRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path.TrimEnd("\")
  $rootPattern = [Regex]::Escape($resolvedRoot)
  $devProcesses = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and
      $_.CommandLine -match $rootPattern -and
      $_.CommandLine -match "scripts[\\/]+dev\.ts(?:\s|$)"
    } |
    Sort-Object CreationDate -Descending

  foreach ($process in $devProcesses) {
    $candidatePorts = Get-NetTCPConnection -State Listen -OwningProcess $process.ProcessId -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalPort -ge 5000 -and $_.LocalPort -lt 6000 } |
      Sort-Object LocalPort

    foreach ($connection in $candidatePorts) {
      try {
        $response = Invoke-WebRequest `
          -UseBasicParsing `
          -Uri "http://127.0.0.1:$($connection.LocalPort)/" `
          -TimeoutSec 1

        if ($response.StatusCode -eq 200 -and $response.Content -match "<title>Ashen Reach") {
          Write-Output $connection.LocalPort
          exit 0
        }
      } catch {
        continue
      }
    }
  }
} catch {
  exit 1
}

exit 1
