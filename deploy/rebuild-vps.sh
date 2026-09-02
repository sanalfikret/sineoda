#!/usr/bin/env bash
# VPS'te kod zaten güncelse: bash deploy/rebuild-vps.sh
# update-vps.sh ve recover-vps.sh bu script'i çağırır.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  echo "docker-compose bulunamadı."
  exit 1
fi

required=(
  server/src/index.ts
  server/src/services/subscriptionActivation.ts
  server/src/services/plans.ts
  server/src/services/billingPlanDefaults.ts
)
for f in "${required[@]}"; do
  if [ ! -f "$f" ]; then
    echo "HATA: $f yok — yanlış klasör (/opt/sineoda olmalı) veya eksik dosya aktarımı."
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

if [ ! -f "$DB_FILE" ]; then
  bash deploy/migrate-persistent.sh || true
fi

echo ">>> yedek al"
bash deploy/backup-vps.sh

echo ">>> disk kontrol"
df -h / /var/lib/docker 2>/dev/null || df -h /
FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
if [ "${FREE_KB:-0}" -lt 2097152 ]; then
  echo "UYARI: Disk dolmak üzere (${FREE_KB} KB boş). Docker cache temizleniyor..."
  docker builder prune -af 2>/dev/null || true
  docker system prune -af 2>/dev/null || true
  FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
fi
if [ "${FREE_KB:-0}" -lt 1048576 ]; then
  echo "HATA: Disk dolu (< 1 GB boş). Önce: docker system prune -af && docker builder prune -af"
  echo "persistent/ klasörüne DOKUNMA."
  df -h
  exit 1
fi

echo ">>> build (site birkaç dakika kapalı olabilir)"
if grep -qE '^VITE_API_URL=.*onrender' .env 2>/dev/null; then
  echo "HATA: .env içinde VITE_API_URL Render'a işaret ediyor — satırı silin (VPS same-origin kullanır)."
  exit 1
fi
if grep -qE '^VITE_API_URL=https?://' .env 2>/dev/null; then
  echo "UYARI: VITE_API_URL dolu — build yine de same-origin (boş) kullanacak."
fi

GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || true)"
if [ -z "$GIT_SHA" ] && [ -f .deploy-sha ]; then
  GIT_SHA="$(tr -d '[:space:]' < .deploy-sha)"
fi
GIT_SHA="${GIT_SHA:-unknown}"
export GIT_SHA
echo ">>> build git: $GIT_SHA"
BUILD_FLAGS=(--build-arg "VITE_API_URL=" --build-arg "GIT_SHA=${GIT_SHA}")
if [ "${REBUILD_NO_CACHE:-0}" = "1" ]; then
  BUILD_FLAGS=(--no-cache "${BUILD_FLAGS[@]}")
fi
VITE_API_URL= $DC build "${BUILD_FLAGS[@]}"

echo ">>> eski container temizle"
$DC down --remove-orphans 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=sineoda") 2>/dev/null || true

echo ">>> container başlat"
if ! $DC up -d 2>/dev/null; then
  echo ">>> docker-compose up başarısız — docker run ile deneniyor"
  docker rm -f sineoda 2>/dev/null || true
  IMAGE="$($DC images -q sineoda_sineoda 2>/dev/null | head -1)"
  if [ -z "$IMAGE" ]; then
    IMAGE="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -i sineoda | head -1)"
  fi
  if [ -z "$IMAGE" ]; then
    echo "HATA: sineoda imajı bulunamadı."
    exit 1
  fi
  docker run -d \
    --name sineoda \
    --restart unless-stopped \
    -p "${HOST_PORT:-3001}:3001" \
    --env-file .env \
    -e WEB_DIST_DIR=/app/web-dist \
    -e DATA_DIR=/app/server/data \
    -e UPLOADS_DIR=/app/server/uploads \
    -e NODE_ENV=production \
    -v "${PERSIST_DIR:-./persistent}/data:/app/server/data" \
    -v "${PERSIST_DIR:-./persistent}/uploads:/app/server/uploads" \
    "$IMAGE"
fi

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
  HTML=$(curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/" || true)
  JS_PATH=$(echo "$HTML" | grep -oE '/assets/index-[^" ]+\.js' | head -1 || true)
  if [ -z "$JS_PATH" ]; then
    echo "HATA: index.html içinde JS bundle bulunamadı."
    exit 1
  fi
  if ! curl -sf "http://127.0.0.1:${HOST_PORT:-3001}${JS_PATH}" >/dev/null; then
    echo "HATA: JS bundle servis edilmiyor: ${JS_PATH}"
    exit 1
  fi
  echo ">>> frontend bundle OK: ${JS_PATH}"
  if ! echo "$HEALTH" | grep -q 'jwtExpiresIn'; then
    echo "HATA: /api/health auth.jwtExpiresIn yok — container eski imaj olabilir."
    exit 1
  fi
  if echo "$HEALTH" | grep -q '"dbExists":false'; then
    echo "HATA: Veritabanı dosyası yok — persistent/data kontrol et!"
    exit 1
  fi
  if ! echo "$HEALTH" | grep -q "\"gitSha\":\"${GIT_SHA}\""; then
    echo "HATA: Container eski kod çalıştırıyor — health gitSha beklenen ${GIT_SHA} değil."
    echo "$HEALTH" | grep -o '"gitSha":"[^"]*"' || true
    echo "Tekrar deneyin: REBUILD_NO_CACHE=1 bash deploy/rebuild-vps.sh"
    exit 1
  fi
  echo ">>> deploy git SHA OK: ${GIT_SHA}"
  DB_SIZE_AFTER=$(db_size "$DB_FILE")
  echo ">>> DB boyutu (deploy sonrası): ${DB_SIZE_AFTER} byte"
  if [ "$DB_SIZE_BEFORE" -gt 50000 ] && [ "$DB_SIZE_AFTER" -lt $((DB_SIZE_BEFORE / 2)) ]; then
    echo "HATA: Veritabanı deploy sonrası belirgin küçüldü!"
    ls -lt "${PERSIST_DIR:-./persistent}/backups/" 2>/dev/null | head -3 || true
    exit 1
  fi
else
  echo "HATA — container ayakta değil. Log:"
  $DC logs --tail=40
  exit 1
fi
