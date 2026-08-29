#!/usr/bin/env bash
# /opt/sineoda içinde: bash deploy/update-vps.sh
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

echo ">>> kaynak dosya kontrolü"
required=(
  server/src/index.ts
  server/src/services/subscriptionActivation.ts
  server/src/services/plans.ts
  server/src/services/billingPlanDefaults.ts
)
for f in "${required[@]}"; do
  if [ ! -f "$f" ]; then
    echo "HATA: $f yok — git pull başarısız veya yanlış klasör (/opt/sineoda olmalı)."
    exit 1
  fi
done

mkdir -p "${PERSIST_DIR:-./persistent}/data" "${PERSIST_DIR:-./persistent}/uploads"

DB_FILE="${PERSIST_DIR:-./persistent}/data/sineoda.db"
db_size() {
  if [ -f "$1" ]; then stat -c%s "$1" 2>/dev/null || stat -f%z "$1"; else echo 0; fi
}
DB_SIZE_BEFORE=$(db_size "$DB_FILE")

echo ">>> DB boyutu (deploy öncesi): ${DB_SIZE_BEFORE} byte — $DB_FILE"

# Yalnızca DB yoksa tek seferlik taşıma
if [ ! -f "$DB_FILE" ]; then
  bash deploy/migrate-persistent.sh || true
fi

echo ">>> yedek al"
bash deploy/backup-vps.sh

echo ">>> build (site birkaç dakika kapalı olabilir)"
if grep -qE '^VITE_API_URL=.*onrender' .env 2>/dev/null; then
  echo "UYARI: .env VITE_API_URL Render'a işaret ediyor — VPS build same-origin kullanacak (boş)."
fi
GIT_SHA="$(git rev-parse --short HEAD)"
export GIT_SHA
echo ">>> build git: $GIT_SHA"
VITE_API_URL= $DC build --no-cache --build-arg VITE_API_URL= --build-arg "GIT_SHA=${GIT_SHA}"

echo ">>> eski container temizle (KeyError ContainerConfig fix)"
$DC down --remove-orphans 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=sineoda") 2>/dev/null || true

echo ">>> container başlat"
$DC up -d

echo ">>> sağlık kontrolü bekleniyor..."
ok=0
for i in $(seq 1 45); do
  if curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" -eq 1 ]; then
  echo "OK — site ayakta."
  HEALTH=$(curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" || true)
  echo "$HEALTH" | head -c 400 || true
  echo ""
  if ! echo "$HEALTH" | grep -q 'jwtExpiresIn'; then
    echo "HATA: /api/health auth.jwtExpiresIn yok — container eski imaj olabilir."
    echo "Deneyin: docker compose build --no-cache && docker compose up -d"
    exit 1
  fi
  if echo "$HEALTH" | grep -q '"dbExists":false'; then
    echo "UYARI: Veritabanı dosyası yok — persistent/data kontrol et!"
    exit 1
  fi
  DB_SIZE_AFTER=$(db_size "$DB_FILE")
  echo ">>> DB boyutu (deploy sonrası): ${DB_SIZE_AFTER} byte"
  if [ "$DB_SIZE_BEFORE" -gt 50000 ] && [ "$DB_SIZE_AFTER" -lt $((DB_SIZE_BEFORE / 2)) ]; then
    echo "HATA: Veritabanı deploy sonrası belirgin küçüldü!"
    echo "Son yedek: ls -lt ${PERSIST_DIR:-./persistent}/backups/ | head -3"
    ls -lt "${PERSIST_DIR:-./persistent}/backups/" 2>/dev/null | head -3 || true
    echo "Geri yükleme: bash deploy/restore-db.sh <yedek-dosyasi>"
    exit 1
  fi
else
  echo "HATA — container ayakta değil. Log:"
  $DC logs --tail=40
  exit 1
fi
