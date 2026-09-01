#!/usr/bin/env bash
# ACİL — proje klasörü yoksa bile kurar. PuTTY: curl -sL ... | bash
# veya: cd /opt/sineoda && bash deploy/vps-rescue.sh
set -euo pipefail

REPO_URL="${PLOOY_REPO_URL:-https://github.com/sanalfikret/sineoda.git}"
INSTALL_DIR="${PLOOY_INSTALL_DIR:-/opt/sineoda}"

echo "=== 1) Mevcut proje aranıyor ==="
FOUND=""
while IFS= read -r path; do
  FOUND="$path"
  break
done < <(find /root /opt /home -path '*/deploy/rebuild-vps.sh' 2>/dev/null | head -1)

if [ -n "$FOUND" ]; then
  INSTALL_DIR="$(dirname "$(dirname "$FOUND")")"
  echo ">>> Bulundu: $INSTALL_DIR"
else
  echo ">>> Klasör yok — kurulum: $INSTALL_DIR"
  mkdir -p "$INSTALL_DIR/persistent/data" "$INSTALL_DIR/persistent/uploads"
  if [ ! -d "$INSTALL_DIR/.git" ]; then
    command -v git >/dev/null || { apt-get update -qq && apt-get install -y -qq git; }
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
fi

cd "$INSTALL_DIR"
echo ">>> pwd=$(pwd)"

echo "=== 2) Eski DB kurtarma (varsa) ==="
if [ ! -f "$INSTALL_DIR/persistent/data/sineoda.db" ]; then
  for cid in $(docker ps -aq 2>/dev/null); do
    src=$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/server/data"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)
    if [ -n "$src" ] && [ -f "$src/sineoda.db" ]; then
      cp -a "$src/sineoda.db" "$INSTALL_DIR/persistent/data/"
      echo ">>> DB kopyalandı: $src/sineoda.db"
      break
    fi
  done
fi

echo "=== 3) Kod güncelle ==="
git fetch origin main
git reset --hard origin/main

echo "=== 4) Eski container durdur ==="
docker stop sineoda-app-1 sineoda-api-1 plooy-web plooy-db 2>/dev/null || true
docker rm -f sineoda-app-1 sineoda-api-1 plooy-web plooy-db 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null || true

echo "=== 5) Rebuild (tek container :3001) ==="
export PERSIST_DIR="$INSTALL_DIR/persistent"
export HOST_PORT=3001
bash deploy/fix-nginx-vps.sh
bash deploy/rebuild-vps.sh

echo ""
echo "=== 6) Doğrulama ==="
curl -sf "http://127.0.0.1:3001/api/health" | head -c 400 || echo "HATA: API yanıt vermiyor"
echo ""
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""
echo ">>> Tarayıcı: Ctrl+Shift+R http://31.42.127.26/"
