# Bilgisayardan VPS kurtarma — git/rsync yok, recover-from-archive çalıştırır
# Kullanım: npm run deploy:vps

param(
  [string]$Remote = "root@31.42.127.26",
  [string]$RemoteDir = "/opt/sineoda"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ">>> npm run check:deploy"
npm run check:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$RecoverUrl = "https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh"

Write-Host ">>> VPS kurtarma: $Remote"
ssh $Remote "curl -fsSL '$RecoverUrl' | bash"

Write-Host ">>> health kontrol"
ssh $Remote "curl -sf http://127.0.0.1:3001/api/health | grep -E 'gitSha|dbExists|userCount' || true"

Write-Host ">>> Tamam - tarayici Ctrl+Shift+R"
