#!/bin/bash
# ACİL — bozuk /opt/sineoda tam kurtarma (git/rsync YOK, DB korunur)
# PuTTY tek satır:
#   curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh | bash
set -eu

INSTALL="/opt/sineoda"
STAGING="/opt/sineoda-staging-$$"
PRESERVE="/tmp/sineoda-preserve-$$"
ARCHIVE="/tmp/sineoda-main-$$.tar.gz"
EXTRACT="/tmp/sineoda-extract-$$"
SHELL_BIN="$(command -v bash 2>/dev/null || command -v sh 2>/dev/null || echo /bin/sh)"

db_bytes() {
  if [ -f "$1" ]; then stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo 0
  else echo 0; fi
}

find_best_db() {
  local best="" size=0 candidate s
  for candidate in \
    "$INSTALL/persistent/data/sineoda.db" \
    "$INSTALL/persistent/sineoda.db" \
    /opt/sineoda-broken-*/persistent/data/sineoda.db \
    /opt/sineoda-broken-*/persistent/sineoda.db \
    /opt/sineoda-*/persistent/data/sineoda.db \
    "$PRESERVE/persistent/data/sineoda.db" \
    "$PRESERVE/persistent/sineoda.db" \
    "$INSTALL/persistent/backups/"sineoda-*.db; do
    [ -f "$candidate" ] || continue
    s="$(db_bytes "$candidate")"
    if [ "$s" -gt "$size" ]; then best="$candidate"; size="$s"; fi
  done
  if [ "$size" -eq 0 ]; then
    for cid in $(docker ps -aq 2>/dev/null); do
      local src
      src="$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/server/data"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
      [ -n "$src" ] && [ -f "$src/sineoda.db" ] || continue
      s="$(db_bytes "$src/sineoda.db")"
      if [ "$s" -gt "$size" ]; then best="$src/sineoda.db"; size="$s"; fi
    done
  fi
  echo "$best"
}

cleanup_temp() {
  rm -rf "$ARCHIVE" "$EXTRACT" "$PRESERVE" 2>/dev/null || true
  [ -n "${STAGING:-}" ] && [ -d "$STAGING" ] && rm -rf "$STAGING" 2>/dev/null || true
}
trap cleanup_temp EXIT

echo "=== 0) container durdur ==="
docker stop sineoda sineoda-app-1 sineoda-api-1 2>/dev/null || true
docker rm -f sineoda sineoda-app-1 sineoda-api-1 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null || true

echo "=== 1) DB + .env yedek ==="
mkdir -p "$PRESERVE/persistent/data" "$PRESERVE/persistent/uploads"
BEST_DB="$(find_best_db)"
if [ -n "$BEST_DB" ]; then
  cp -a "$BEST_DB" "$PRESERVE/persistent/data/sineoda.db"
  echo ">>> DB bulundu: $BEST_DB ($(du -h "$PRESERVE/persistent/data/sineoda.db" | cut -f1))"
else
  echo ">>> UYARI: DB bulunamadı — boş kurulum olabilir"
fi
if [ -d "$INSTALL/persistent/uploads" ]; then
  cp -a "$INSTALL/persistent/uploads/." "$PRESERVE/persistent/uploads/" 2>/dev/null || true
fi
if [ -f "$INSTALL/.env" ]; then
  cp -a "$INSTALL/.env" "$PRESERVE/"
fi

echo "=== 2) GitHub arşivi indir ==="
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"

echo "=== 3) staging ==="
mkdir -p "$EXTRACT" "$STAGING"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/server/src/index.ts" ]; then
  echo "HATA: geçerli sineoda kaynak arşivi değil."
  exit 1
fi
cp -a "$SRC"/. "$STAGING/"

echo "=== 4) persistent + .env geri yükle ==="
rm -rf "$STAGING/persistent"
mkdir -p "$STAGING/persistent/data" "$STAGING/persistent/uploads"
if [ -f "$PRESERVE/persistent/data/sineoda.db" ]; then
  cp -a "$PRESERVE/persistent/data/sineoda.db" "$STAGING/persistent/data/"
fi
if [ -d "$PRESERVE/persistent/uploads" ]; then
  cp -a "$PRESERVE/persistent/uploads/." "$STAGING/persistent/uploads/" 2>/dev/null || true
fi
if [ -f "$PRESERVE/.env" ]; then
  cp -a "$PRESERVE/.env" "$STAGING/"
elif [ ! -f "$STAGING/.env" ] && [ -f "$STAGING/deploy/env.production.example" ]; then
  cp "$STAGING/deploy/env.production.example" "$STAGING/.env"
fi

echo "=== 5) klasör değiştir ==="
BACKUP="/opt/sineoda-broken-$(date +%Y%m%d-%H%M%S)"
if [ -d "$INSTALL" ]; then
  mv "$INSTALL" "$BACKUP"
  echo ">>> bozuk sürüm: $BACKUP"
fi
mv "$STAGING" "$INSTALL"
STAGING=""

if [ ! -f "$INSTALL/persistent/data/sineoda.db" ]; then
  echo "HATA: DB staging sonrası da yok!"
  ls -la "$INSTALL/persistent/data/" 2>/dev/null || true
  exit 1
fi

echo "=== 6) rebuild ==="
export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT="${HOST_PORT:-3001}"
cd "$INSTALL"
"$SHELL_BIN" deploy/rebuild-vps.sh

echo ""
echo "=== 7) doğrulama ==="
HEALTH="$(curl -sf "http://127.0.0.1:${HOST_PORT}/api/health" || true)"
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"dbExists":true'; then
  echo ">>> OK — DB ve site ayakta. Tarayıcı Ctrl+Shift+R"
else
  echo ">>> UYARI: dbExists false — persistent mount kontrol et"
  ls -la "$INSTALL/persistent/data/"
fi
