#!/usr/bin/env bash
# Yedekten veritabanı geri yükle.
# Kullanım: bash deploy/restore-db.sh persistent/sineoda_20240826_233353.db
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "Kullanım: bash deploy/restore-db.sh YEDEK_DOSYASI.db"
  echo "Örnek:   bash deploy/restore-db.sh persistent/sineoda_20240826_233353.db"
  exit 1
fi

SRC="$1"
PERSIST_DIR="${PERSIST_DIR:-./persistent}"
TARGET="$PERSIST_DIR/data/sineoda.db"

if [ ! -f "$SRC" ]; then
  echo "Dosya yok: $SRC"
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC=""
fi

mkdir -p "$PERSIST_DIR/backups" "$PERSIST_DIR/data"

if [ -f "$TARGET" ]; then
  STAMP=$(date +%Y%m%d-%H%M%S)
  cp "$TARGET" "$PERSIST_DIR/backups/sineoda-before-restore-$STAMP.db"
  echo "Mevcut DB yedeklendi."
fi

cp "$SRC" "$TARGET"
echo "Geri yüklendi: $SRC -> $TARGET ($(du -h "$TARGET" | cut -f1))"

if [ -n "$DC" ]; then
  echo ">>> container yeniden başlatılıyor"
  $DC restart
  sleep 3
  curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" | head -c 400 || true
  echo ""
fi

echo "Bitti. Admin panelden üyeleri kontrol et."
