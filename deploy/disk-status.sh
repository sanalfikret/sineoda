#!/usr/bin/env bash
# VPS disk / veri durumu — format gerekir mi?
# PuTTY: cd /opt/sineoda && bash deploy/disk-status.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PERSIST="${PERSIST_DIR:-$ROOT/persistent}"
DB="$PERSIST/data/sineoda.db"

echo "=== Disk (kök) ==="
df -h / 2>/dev/null || df -h
echo ""

if [ -d /var/lib/docker ]; then
  echo "=== Docker disk ==="
  df -h /var/lib/docker 2>/dev/null || true
  echo ""
fi

FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
FREE_GB=$((FREE_KB / 1024 / 1024))
echo "Boş alan: ~${FREE_GB} GB"
if [ "${FREE_KB:-0}" -lt 1048576 ]; then
  echo "⚠ KRİTİK: 1 GB altı — docker system prune -af (persistent/ dokunma)"
elif [ "${FREE_KB:-0}" -lt 2097152 ]; then
  echo "⚠ UYARI: 2 GB altı — eski docker cache temizliği önerilir"
else
  echo "✓ Disk yeterli — format gerekmez"
fi
echo ""

echo "=== Plooy veri (persistent/) ==="
if [ -d "$PERSIST" ]; then
  du -sh "$PERSIST" 2>/dev/null || true
  du -sh "$PERSIST/data" "$PERSIST/uploads" "$PERSIST/backups" 2>/dev/null || true
else
  echo "persistent/ bulunamadı: $PERSIST"
fi
echo ""

echo "=== Veritabanı ==="
if [ -f "$DB" ]; then
  ls -lh "$DB"
  if command -v curl >/dev/null 2>&1; then
    curl -s http://127.0.0.1:3001/api/health 2>/dev/null | head -c 400 || true
    echo ""
  fi
else
  echo "DB yok: $DB"
fi
echo ""

echo "=== Docker kullanımı ==="
docker system df 2>/dev/null || echo "(docker yok veya erişim yok)"
echo ""

if [ -d "$PERSIST/backups" ]; then
  BACKUP_COUNT=$(ls -1 "$PERSIST/backups"/sineoda-*.db 2>/dev/null | wc -l | tr -d ' ')
  echo "=== Yedekler ==="
  echo "Adet: ${BACKUP_COUNT:-0} (son 30 tutulur)"
  ls -1t "$PERSIST/backups"/sineoda-*.db 2>/dev/null | head -3 || true
fi

echo ""
if [ -f "$ROOT/.deploy-sha" ]; then
  echo "Deploy SHA: $(tr -d '[:space:]' < "$ROOT/.deploy-sha")"
fi
