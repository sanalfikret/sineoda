#!/usr/bin/env bash
# Tek komut deploy — PuTTY: cd ~/plooy && bash deploy/deploy-vps.sh
set -euo pipefail

if [ -f "$(dirname "$0")/rebuild-vps.sh" ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
else
  ROOT=""
  for candidate in /opt/Plooy /opt/sineoda /opt/plooy /root/plooy /root/Plooy /root/sineoda; do
    if [ -f "$candidate/deploy/rebuild-vps.sh" ]; then
      ROOT="$candidate"
      break
    fi
  done
  if [ -z "$ROOT" ]; then
    echo "HATA: Proje klasörü bulunamadı."
    echo "  bash deploy/find-vps-project.sh"
    echo "  veya: cd ~/plooy"
    exit 1
  fi
fi
cd "$ROOT"

if [ ! -d .git ]; then
  echo "HATA: Git repo değil — pwd=$(pwd)"
  echo "  bash deploy/find-vps-project.sh ile doğru klasörü bul"
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
