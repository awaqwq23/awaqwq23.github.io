$ErrorActionPreference = 'Stop'

$taskName = 'awaqwq233-edge-favorites-sync'
$syncScript = Join-Path $PSScriptRoot 'daily_sync.ps1'
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path -LiteralPath $syncScript)) {
  throw "未找到同步脚本：$syncScript"
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$syncScript`""
$trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Monday -At '09:00'
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description '每周一同步 Edge 收藏夹与网易云音乐到 awaqwq233.github.io，并推送 GitHub。' `
  -Force | Out-Null

Write-Output "每周同步任务已启用：$taskName（每周一 09:00，错过后尽快补跑）"
