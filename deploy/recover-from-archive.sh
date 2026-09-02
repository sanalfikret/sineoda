#!/bin/bash
# ACİL — bozuk /opt/sineoda tam kurtarma (git/rsync YOK)
# PuTTY (YENİ oturum aç, ~/sineoda'ya GİRME):
#   export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
#   /usr/bin/curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh | /bin/bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

CURL="${CURL:-/usr/bin/curl}"
CP="${CP:-/bin/cp}"
MV="${MV:-/bin/mv}"
RM="${RM:-/bin/rm}"
MKDIR="${MKDIR:-/bin/mkdir}"
TAR="${TAR:-/bin/tar}"
FIND="${FIND:-/usr/bin/find}"
DOCKER="${DOCKER:-/usr/bin/docker}"
BASH_BIN="${BASH_BIN:-/bin/bash}"
STAT="${STAT:-/usr/bin/stat}"
DU="${DU:-/usr/bin/du}"
DATE="${DATE:-/bin/date}"

INSTALL="/opt/sineoda"
STAGING="/opt/sineoda-staging-$$"
PRESERVE="/tmp/sineoda-preserve-$$"
ARCHIVE="/tmp/sineoda-main-$$.tar.gz"
EXTRACT="/tmp/sineoda-extract-$$"

db_bytes() {
  if [ -f "$1" ]; then "$STAT" -c%s "$1" 2>/dev/null || echo 0; else echo 0; fi
}

find_best_db() {
  local best="" size=0 s candidate
  while IFS= read -r candidate; do
    [ -f "$candidate" ] || continue
    s="$(db_bytes "$candidate")"
    [ "$s" -gt 50000 ] || continue
    if [ "$s" -gt "$size" ]; then best="$candidate"; size="$s"; fi
  done < <("$FIND" /opt /root /home /tmp -type f \( -name 'sineoda.db' -o -name 'sineoda-*.db' \) 2>/dev/null || true)
  if [ "$size" -eq 0 ] && [ -x "$DOCKER" ]; then
    for cid in $($DOCKER ps -aq 2>/dev/null); do
      src="$($DOCKER inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/server/data"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
      [ -n "$src" ] && [ -f "$src/sineoda.db" ] || continue
      s="$(db_bytes "$src/sineoda.db")"
      [ "$s" -gt "$size" ] && best="$src/sineoda.db" && size="$s"
    done
  fi
  printf '%s' "$best"
}

cleanup_temp() {
  "$RM" -rf "$ARCHIVE" "$EXTRACT" "$PRESERVE" 2>/dev/null || true
  [ -n "${STAGING:-}" ] && [ -d "$STAGING" ] && "$RM" -rf "$STAGING" 2>/dev/null || true
}
trap cleanup_temp EXIT

echo "=== 0) container durdur ==="
"$DOCKER" stop sineoda sineoda-app-1 sineoda-api-1 2>/dev/null || true
"$DOCKER" rm -f sineoda sineoda-app-1 sineoda-api-1 2>/dev/null || true
"$DOCKER" compose down --remove-orphans 2>/dev/null || true

echo "=== 1) DB + .env yedek ==="
"$MKDIR" -p "$PRESERVE/persistent/data" "$PRESERVE/persistent/uploads"
BEST_DB="$(find_best_db)"
if [ -n "$BEST_DB" ]; then
  "$CP" -a "$BEST_DB" "$PRESERVE/persistent/data/sineoda.db"
  echo ">>> DB bulundu: $BEST_DB ($("$DU" -h "$PRESERVE/persistent/data/sineoda.db" | cut -f1))"
else
  echo ">>> UYARI: DB bulunamadı"
fi
for uploads_dir in "$INSTALL/persistent/uploads" /opt/sineoda-broken-*/persistent/uploads; do
  [ -d "$uploads_dir" ] || continue
  "$CP" -a "$uploads_dir/." "$PRESERVE/persistent/uploads/" 2>/dev/null || true
done
for env_file in "$INSTALL/.env" /opt/sineoda-broken-*/.env; do
  [ -f "$env_file" ] || continue
  "$CP" -a "$env_file" "$PRESERVE/.env"
  break
done

echo "=== 2) GitHub arşivi indir ==="
"$CURL" -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"

echo "=== 3) staging ==="
"$MKDIR" -p "$EXTRACT" "$STAGING"
"$TAR" -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$("$FIND" "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/server/src/index.ts" ]; then
  echo "HATA: geçerli kaynak arşivi değil."
  exit 1
fi
"$CP" -a "$SRC"/. "$STAGING/"

echo "=== 4) persistent + .env ==="
"$RM" -rf "$STAGING/persistent"
"$MKDIR" -p "$STAGING/persistent/data" "$STAGING/persistent/uploads"
if [ ! -f "$PRESERVE/persistent/data/sineoda.db" ]; then
  BEST_DB="$(find_best_db)"
  [ -n "$BEST_DB" ] && "$CP" -a "$BEST_DB" "$PRESERVE/persistent/data/sineoda.db"
fi
if [ -f "$PRESERVE/persistent/data/sineoda.db" ]; then
  "$CP" -a "$PRESERVE/persistent/data/sineoda.db" "$STAGING/persistent/data/"
  "$MKDIR" -p "$STAGING/persistent/backups"
  "$CP" -a "$PRESERVE/persistent/data/sineoda.db" "$STAGING/persistent/backups/sineoda-recover-$("$DATE" +%Y%m%d-%H%M%S).db"
else
  echo ">>> UYARI: DB yok — boş kurulum"
  "$MKDIR" -p "$STAGING/persistent/data"
fi
[ -d "$PRESERVE/persistent/uploads" ] && "$CP" -a "$PRESERVE/persistent/uploads/." "$STAGING/persistent/uploads/" 2>/dev/null || true
if [ -f "$PRESERVE/.env" ]; then
  "$CP" -a "$PRESERVE/.env" "$STAGING/"
elif [ ! -f "$STAGING/.env" ] && [ -f "$STAGING/deploy/env.production.example" ]; then
  "$CP" "$STAGING/deploy/env.production.example" "$STAGING/.env"
fi

echo "=== 5) klasör değiştir ==="
BACKUP="/opt/sineoda-broken-$("$DATE" +%Y%m%d-%H%M%S)"
[ -d "$INSTALL" ] && "$MV" "$INSTALL" "$BACKUP" && echo ">>> bozuk: $BACKUP"
"$MV" "$STAGING" "$INSTALL"
STAGING=""

echo "=== 6) rebuild ==="
export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT="${HOST_PORT:-3001}"
cd "$INSTALL"
"$BASH_BIN" deploy/rebuild-vps.sh

echo ""
echo "=== 7) doğrulama ==="
HEALTH="$("$CURL" -sf "http://127.0.0.1:${HOST_PORT}/api/health" || true)"
echo "$HEALTH"
echo "$HEALTH" | /bin/grep -q '"dbExists":true' && echo ">>> OK — Ctrl+Shift+R" || echo ">>> dbExists false — ls persistent/data"
