#!/usr/bin/env bash
# Eski konumlardaki veritabanını doğru klasöre taşır — YALNIZCA ilk kurulumda.
# Mevcut persistent/data/sineoda.db ASLA ezilmez.
# /opt/sineoda içinde: bash deploy/migrate-persistent.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PERSIST_DIR="${PERSIST_DIR:-./persistent}"
TARGET="$PERSIST_DIR/data/sineoda.db"
MARKER="$PERSIST_DIR/.migration-done"
mkdir -p "$PERSIST_DIR/data" "$PERSIST_DIR/uploads" "$PERSIST_DIR/backups"

size_of() {
  if [ -f "$1" ]; then
    stat -c%s "$1" 2>/dev/null || stat -f%z "$1"
  else
    echo 0
  fi
}

if [ -f "$TARGET" ]; then
  echo "Atlandı — aktif DB zaten var: $TARGET ($(du -h "$TARGET" | cut -f1))"
  touch "$MARKER"
  exit 0
fi

if [ -f "$MARKER" ]; then
  echo "Atlandı — migration daha önce yapılmış, hedef DB yok (yeni kurulum bekleniyor)."
  exit 0
fi

echo ">>> İlk kurulum: eski konumlardan DB aranıyor..."

LEGACY_ROOT="$PERSIST_DIR/sineoda.db"
LEGACY_BACKUPS=()
while IFS= read -r f; do LEGACY_BACKUPS+=("$f"); done < <(find "$PERSIST_DIR" -maxdepth 1 -name 'sineoda_*.db' -type f 2>/dev/null || true)

VOL_DATA=""
while IFS= read -r v; do
  case "$v" in
    *sineoda-data|*sineoda_data) VOL_DATA="$v" ;;
  esac
done < <(docker volume ls -q 2>/dev/null || true)

SOURCE=""
SOURCE_SIZE=0

for candidate in "$LEGACY_ROOT" "${LEGACY_BACKUPS[@]}"; do
  [ -f "$candidate" ] || continue
  size=$(size_of "$candidate")
  if [ "$size" -gt "$SOURCE_SIZE" ]; then
    SOURCE="$candidate"
    SOURCE_SIZE=$size
  fi
done

if [ -n "$VOL_DATA" ] && [ "$SOURCE_SIZE" -eq 0 ]; then
  echo ">>> docker volume kontrol: $VOL_DATA"
  docker run --rm \
    -v "$VOL_DATA:/from:ro" \
    -v "$(pwd)/$PERSIST_DIR/data:/to" \
    alpine sh -c 'cp -a /from/sineoda.db /to/sineoda.db 2>/dev/null || true'
  if [ -f "$TARGET" ]; then
    SOURCE="$TARGET"
    SOURCE_SIZE=$(size_of "$TARGET")
  fi
fi

if [ -z "$SOURCE" ] || [ ! -f "$SOURCE" ]; then
  echo "Eski DB bulunamadı — boş kurulum devam edecek."
  touch "$MARKER"
  exit 0
fi

if [ "$SOURCE" != "$TARGET" ]; then
  cp "$SOURCE" "$TARGET"
fi

touch "$MARKER"
echo "OK — taşındı: $SOURCE -> $TARGET ($(du -h "$TARGET" | cut -f1))"

# uploads volume taşı (yalnızca boşsa)
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

echo "Doğrula: ls -la $TARGET"
