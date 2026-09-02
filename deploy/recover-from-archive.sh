#!/bin/bash
# BOZUK /opt/sineoda kurtarma — git ve rsync kullanmaz, atomik klasör değişimi
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh | /bin/bash
set -eu

INSTALL="/opt/sineoda"
STAGING="/opt/sineoda-staging-$$"
PRESERVE="/tmp/sineoda-preserve-$$"
ARCHIVE="/tmp/sineoda-main-$$.tar.gz"
EXTRACT="/tmp/sineoda-extract-$$"

cleanup() {
  rm -rf "$ARCHIVE" "$EXTRACT" "$PRESERVE" 2>/dev/null || true
  rm -rf "$STAGING" 2>/dev/null || true
}

finish() {
  cleanup
}
trap finish EXIT

echo "=== 1) persistent + .env yedek ==="
mkdir -p "$PRESERVE"
if [ -d "$INSTALL/persistent" ]; then
  cp -a "$INSTALL/persistent" "$PRESERVE/"
  echo ">>> DB: $(du -h "$INSTALL/persistent/data/sineoda.db" 2>/dev/null || echo yok)"
fi
if [ -f "$INSTALL/.env" ]; then
  cp -a "$INSTALL/.env" "$PRESERVE/"
fi

echo "=== 2) GitHub arşivi indir ==="
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"

echo "=== 3) staging klasörüne çıkar ==="
mkdir -p "$EXTRACT" "$STAGING"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "HATA: sineoda-main bulunamadı."
  exit 1
fi
cp -a "$SRC"/. "$STAGING/"

echo "=== 4) yedekleri staging'e koy ==="
rm -rf "$STAGING/persistent"
if [ -d "$PRESERVE/persistent" ]; then
  cp -a "$PRESERVE/persistent" "$STAGING/"
else
  mkdir -p "$STAGING/persistent/data" "$STAGING/persistent/uploads"
fi
if [ -f "$PRESERVE/.env" ]; then
  cp -a "$PRESERVE/.env" "$STAGING/"
elif [ -f "$INSTALL/deploy/env.production.example" ] && [ ! -f "$STAGING/.env" ]; then
  cp "$STAGING/deploy/env.production.example" "$STAGING/.env"
fi

echo "=== 5) klasör değiştir (bozuk sürüm yedekte kalır) ==="
BACKUP="/opt/sineoda-broken-$(date +%Y%m%d-%H%M%S)"
if [ -d "$INSTALL" ]; then
  mv "$INSTALL" "$BACKUP"
  echo ">>> eski klasör: $BACKUP"
fi
mv "$STAGING" "$INSTALL"
STAGING=""

echo "=== 6) docker rebuild ==="
export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT="${HOST_PORT:-3001}"
cd "$INSTALL"
/bin/bash deploy/rebuild-vps.sh

echo ""
echo "=== 7) doğrulama ==="
curl -sf "http://127.0.0.1:${HOST_PORT}/api/health" || echo "HATA: health yok"
echo ""
echo ">>> Site geri yüklendi. Tarayıcı: Ctrl+Shift+R"
