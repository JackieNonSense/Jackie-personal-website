$repoPath = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort 3011 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $previewProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if (-not $previewProcess.CommandLine.Contains("$repoPath\node_modules\next\")) { throw 'Port 3011 is owned by a different application; not stopping it.' }
    Stop-Process -Id $previewProcess.ProcessId
}
Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList "`"$repoPath\node_modules\next\dist\bin\next`" dev --port 3011" -WorkingDirectory $repoPath -RedirectStandardOutput "$repoPath\.cache\deck-dev.log" -RedirectStandardError "$repoPath\.cache\deck-dev-error.log" -WindowStyle Hidden
