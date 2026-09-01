#!/usr/bin/env bash
# Bu sunucuya özel — PuTTY'de herhangi bir yerden: bash /root/plooy/deploy/vps-now.sh
set -euo pipefail

ROOT="/root/plooy"
if [ ! -f "$ROOT/deploy/rebuild-vps.sh" ]; then
  echo "HATA: $ROOT yok. ls -la /root/plooy"
  exit 1
fi

cd "$ROOT"
echo ">>> pwd=$(pwd)"
git fetch origin main
git reset --hard origin/main
bash deploy/fix-nginx-vps.sh
bash deploy/rebuild-vps.sh

echo ""
curl -sf "http://127.0.0.1:3001/api/health" | grep -E 'gitSha|dbExists|userCount' || true
echo ""
echo ">>> Tarayıcı: Ctrl+Shift+R http://31.42.127.26/"
