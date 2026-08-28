#!/usr/bin/env bash
# Eski Docker named volume verisini host diskine taşır (tek seferlik).
# /opt/sineoda içinde: bash deploy/migrate-persistent.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PERSIST_DIR="${PERSIST_DIR:-./persistent}"
mkdir -p "$PERSIST_DIR/data" "$PERSIST_DIR/uploads"

if [ -f "$PERSIST_DIR/data/sineoda.db" ]; then
  echo "Zaten taşınmış: $PERSIST_DIR/data/sineoda.db"
  exit 0
fi

VOL_DATA=""
VOL_UPLOADS=""
while IFS= read -r v; do
  case "$v" in
    *sineoda-data|*sineoda_data) VOL_DATA="$v" ;;
    *sineoda-uploads|*sineoda_uploads) VOL_UPLOADS="$v" ;;
  esac
done < <(docker volume ls -q 2>/dev/null || true)

if [ -z "$VOL_DATA" ]; then
  echo "Eski sineoda-data volume bulunamadı — yeni kurulum, taşıma gerekmez."
  exit 0
fi

echo ">>> volume -> host: $VOL_DATA -> $PERSIST_DIR/data"
docker run --rm \
  -v "$VOL_DATA:/from:ro" \
  -v "$(pwd)/$PERSIST_DIR/data:/to" \
  alpine sh -c 'cp -a /from/. /to/ 2>/dev/null || true'

if [ -n "$VOL_UPLOADS" ]; then
  echo ">>> volume -> host: $VOL_UPLOADS -> $PERSIST_DIR/uploads"
  docker run --rm \
    -v "$VOL_UPLOADS:/from:ro" \
    -v "$(pwd)/$PERSIST_DIR/uploads:/to" \
    alpine sh -c 'cp -a /from/. /to/ 2>/dev/null || true'
fi

if [ -f "$PERSIST_DIR/data/sineoda.db" ]; then
  echo "OK — veri taşındı: $PERSIST_DIR/data/sineoda.db"
else
  echo "UYARI — volume vardı ama sineoda.db kopyalanamadı. Logları kontrol et."
  exit 1
fi
