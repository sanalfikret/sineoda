#!/usr/bin/env bash
# Veritabanı yedeği — deploy öncesi veya cron ile çalıştır.
# /opt/sineoda içinde: bash deploy/backup-vps.sh
set -euo pipefail

cd "$(dirname "$0")/.."

PERSIST_DIR="${PERSIST_DIR:-./persistent}"
DATA_DIR="$PERSIST_DIR/data"
BACKUP_DIR="$PERSIST_DIR/backups"
DB="$DATA_DIR/sineoda.db"
KEEP="${BACKUP_KEEP:-30}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB" ]; then
  echo "Yedeklenecek veritabanı yok: $DB"
  exit 0
fi

STAMP=$(date +%Y%m%d-%H%M%S)
TARGET="$BACKUP_DIR/sineoda-$STAMP.db"
cp "$DB" "$TARGET"
echo "Yedek: $TARGET ($(du -h "$TARGET" | cut -f1))"

# Eski yedekleri temizle
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/sineoda-*.db 2>/dev/null || true)
if [ "${#OLD[@]}" -gt "$KEEP" ]; then
  for f in "${OLD[@]:$KEEP}"; do
    rm -f "$f"
  done
fi
