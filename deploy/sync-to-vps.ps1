# Bilgisayardan VPS'e kod aktar + rebuild (GitHub gerekmez)
# Kullanım: powershell -File deploy/sync-to-vps.ps1
# Fikret VPS: powershell -File deploy/sync-to-vps.ps1 -Remote "root@31.42.127.26" -RemoteDir "/opt/sineoda"

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

$Archive = Join-Path $env:TEMP "sineoda-deploy.tgz"
if (Test-Path $Archive) { Remove-Item $Archive -Force }

Write-Host ">>> arşiv oluşturuluyor"
tar -czf $Archive `
  --exclude=node_modules `
  --exclude=server/node_modules `
  --exclude=persistent `
  --exclude=.git `
  --exclude=dist `
  .

Write-Host ">>> VPS'e aktarılıyor: $Remote"
scp $Archive "${Remote}:/tmp/sineoda-deploy.tgz"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> VPS'te açılıyor + rebuild"
ssh $Remote @"
set -e
mkdir -p '$RemoteDir/persistent/data' '$RemoteDir/persistent/uploads'
cd '$RemoteDir'
tar -xzf /tmp/sineoda-deploy.tgz
rm -f /tmp/sineoda-deploy.tgz
export SINEODA_SKIP_GIT_PULL=1
export PERSIST_DIR='$RemoteDir/persistent'
bash deploy/fix-nginx-vps.sh 2>/dev/null || true
bash deploy/rebuild-vps.sh
"@

Write-Host ">>> Tamam"
