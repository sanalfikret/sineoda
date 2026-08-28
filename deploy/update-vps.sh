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

echo ">>> build (site birkaç dakika kapalı olabilir)"
$DC build

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
  curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" | head -c 120 || true
  echo ""
else
  echo "HATA — container ayakta değil. Log:"
  $DC logs --tail=40
  exit 1
fi
