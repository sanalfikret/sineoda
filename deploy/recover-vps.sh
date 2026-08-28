#!/usr/bin/env bash
# ACİL 502 kurtarma — /opt/sineoda içinde: bash deploy/recover-vps.sh
# (git pull + rebuild + container temizliği — eksik dosya / eski image için gerekli)
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  echo "docker-compose bulunamadı."
  exit 1
fi

echo ">>> git pull"
git pull

mkdir -p "${PERSIST_DIR:-./persistent}/data" "${PERSIST_DIR:-./persistent}/uploads"
bash deploy/migrate-persistent.sh || true
bash deploy/backup-vps.sh || true

echo ">>> build (kod güncellendi; birkaç dakika sürebilir)"
$DC build

echo ">>> eski container temizle (KeyError ContainerConfig fix)"
$DC down --remove-orphans 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=sineoda") 2>/dev/null || true

echo ">>> container başlat"
$DC up -d

echo ">>> bekleniyor..."
ok=0
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" -eq 1 ]; then
  echo "OK — site ayakta."
  curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" | head -c 150 || true
  echo ""
  curl -sI "http://127.0.0.1/" | head -1 || true
else
  echo "HATA — log:"
  $DC logs --tail=50
  exit 1
fi
