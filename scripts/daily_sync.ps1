$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $PSScriptRoot 'daily_sync.log'
$git = Get-Command git -ErrorAction Stop
$node = Get-Command node -ErrorAction Stop
$python = Get-Command python -ErrorAction Stop

Start-Transcript -Path $logPath -Append | Out-Null
try {
  Set-Location -LiteralPath $repoRoot

  & $node.Source (Join-Path $PSScriptRoot 'sync_edge_favorites.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Edge 收藏夹同步失败' }

  & $python.Source (Join-Path $PSScriptRoot 'sync_netease_music.py')
  if ($LASTEXITCODE -ne 0) { throw '网易云音乐同步失败' }

  & $git.Source diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    Write-Warning '检测到已有暂存内容，为避免混入自动提交，本次只更新本地数据。'
    return
  }

  & $git.Source add -- 'public/materials/favorites.json' 'public/materials/netease-music.json'
  & $git.Source diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Output '今日数据没有变化，无需推送。'
    return
  }

  $date = Get-Date -Format 'yyyy-MM-dd'
  & $git.Source commit -m "chore(materials): sync favorites and music $date"
  if ($LASTEXITCODE -ne 0) { throw '自动提交失败' }

  & $git.Source push origin HEAD
  if ($LASTEXITCODE -ne 0) { throw '自动推送失败，请检查网络或远端是否有新提交' }
  Write-Output '每日收藏夹与音乐数据已同步并推送。'
}
finally {
  Stop-Transcript | Out-Null
}
