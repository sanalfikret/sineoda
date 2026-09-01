#!/usr/bin/env bash
# Tek komut deploy — PuTTY: cd /opt/Plooy && bash deploy/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d .git ]; then
  echo "HATA: Git repo değil — pwd=$(pwd)"
  echo "      Doğru klasör: cd /opt/Plooy"
  exit 1
fi

echo ">>> $(pwd)"
git pull origin main
bash deploy/fix-nginx-vps.sh
bash deploy/rebuild-vps.sh

echo ""
echo ">>> doğrulama"
curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" | head -c 500 || true
echo ""
JS=$(curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/" | grep -oE '/assets/index-[^"]+\.js' | head -1 || true)
echo ">>> JS bundle: ${JS:-BULUNAMADI}"
echo ">>> Tarayıcıda Ctrl+Shift+R — http://31.42.127.26/"
