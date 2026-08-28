#!/usr/bin/env bash
# Eski konumlardaki veritabanını doğru klasöre taşır / birleştirir.
# /opt/sineoda içinde: bash deploy/migrate-persistent.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PERSIST_DIR="${PERSIST_DIR:-./persistent}"
TARGET="$PERSIST_DIR/data/sineoda.db"
mkdir -p "$PERSIST_DIR/data" "$PERSIST_DIR/uploads" "$PERSIST_DIR/backups"

size_of() {
  if [ -f "$1" ]; then
    stat -c%s "$1" 2>/dev/null || stat -f%z "$1"
  else
    echo 0
  fi
}

pick_largest() {
  local best="" best_size=0 size
  for f in "$@"; do
    [ -f "$f" ] || continue
    size=$(size_of "$f")
    if [ "$size" -gt "$best_size" ]; then
      best="$f"
      best_size=$size
    fi
  done
  echo "$best"
}

echo ">>> legacy dosya konumları kontrol"

# 1) persistent/sineoda.db (eski yanlış konum)
LEGACY_ROOT="$PERSIST_DIR/sineoda.db"

# 2) persistent/sineoda_*.db (manuel yedekler)
LEGACY_BACKUPS=()
while IFS= read -r f; do LEGACY_BACKUPS+=("$f"); done < <(find "$PERSIST_DIR" -maxdepth 1 -name 'sineoda_*.db' -type f 2>/dev/null || true)

# 3) persistent/backups/*
NEW_BACKUPS=()
while IFS= read -r f; do NEW_BACKUPS+=("$f"); done < <(find "$PERSIST_DIR/backups" -name 'sineoda*.db' -type f 2>/dev/null || true)

# 4) Docker named volume
VOL_DATA=""
while IFS= read -r v; do
  case "$v" in
    *sineoda-data|*sineoda_data) VOL_DATA="$v" ;;
  esac
done < <(docker volume ls -q 2>/dev/null || true)

VOL_TMP=""
if [ -n "$VOL_DATA" ]; then
  VOL_TMP=$(mktemp)
  docker run --rm -v "$VOL_DATA:/from:ro" -v "$VOL_TMP:/to" alpine sh -c 'cp -a /from/sineoda.db /to/sineoda.db 2>/dev/null || true'
fi

CANDIDATES=()
[ -f "$TARGET" ] && CANDIDATES+=("$TARGET")
[ -f "$LEGACY_ROOT" ] && CANDIDATES+=("$LEGACY_ROOT")
[ -n "$VOL_TMP" ] && [ -f "$VOL_TMP/sineoda.db" ] && CANDIDATES+=("$VOL_TMP/sineoda.db")
for f in "${LEGACY_BACKUPS[@]}" "${NEW_BACKUPS[@]}"; do
  CANDIDATES+=("$f")
done

BEST=$(pick_largest "${CANDIDATES[@]}")
[ -n "$VOL_TMP" ] && rm -rf "$VOL_TMP"

if [ -z "$BEST" ]; then
  echo "Veritabanı bulunamadı — yeni kurulum."
  exit 0
fi

BEST_SIZE=$(size_of "$BEST")
TARGET_SIZE=$(size_of "$TARGET")

if [ ! -f "$TARGET" ] || [ "$BEST_SIZE" -gt "$TARGET_SIZE" ]; then
  if [ -f "$TARGET" ] && [ "$TARGET" != "$BEST" ]; then
    STAMP=$(date +%Y%m%d-%H%M%S)
    cp "$TARGET" "$PERSIST_DIR/backups/sineoda-before-migrate-$STAMP.db"
    echo "Mevcut küçük DB yedeklendi."
  fi
  cp "$BEST" "$TARGET"
  echo "OK — aktif DB: $TARGET ($(du -h "$TARGET" | cut -f1)) kaynak: $BEST"
else
  echo "OK — aktif DB zaten güncel: $TARGET ($(du -h "$TARGET" | cut -f1))"
fi

# uploads volume taşı
if [ ! "$(ls -A "$PERSIST_DIR/uploads" 2>/dev/null)" ]; then
  VOL_UPLOADS=""
  while IFS= read -r v; do
    case "$v" in
      *sineoda-uploads|*sineoda_uploads) VOL_UPLOADS="$v" ;;
    esac
  done < <(docker volume ls -q 2>/dev/null || true)
  if [ -n "$VOL_UPLOADS" ]; then
    echo ">>> uploads volume taşınıyor"
    docker run --rm \
      -v "$VOL_UPLOADS:/from:ro" \
      -v "$(pwd)/$PERSIST_DIR/uploads:/to" \
      alpine sh -c 'cp -a /from/. /to/ 2>/dev/null || true'
  fi
fi

echo ""
echo "Doğrula: ls -la $TARGET"
