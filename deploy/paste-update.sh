#!/bin/bash
# Tek komut: arşivden güncelle + rebuild (git gerekmez)
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/paste-update.sh | bash
set -eu

INSTALL="${SINEODA_ROOT:-/opt/sineoda}"
mkdir -p "$INSTALL/persistent/data" "$INSTALL/persistent/uploads"

export SINEODA_ROOT="$INSTALL"
ARCHIVE="/tmp/sineoda-main.tar.gz"
EXTRACT="/tmp/sineoda-extract"

rm -rf "$EXTRACT" 2>/dev/null || true
mkdir -p "$EXTRACT"

echo ">>> indir + kopyala → $INSTALL"
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ]; then
  echo "HATA: sineoda-main bulunamadı."
  exit 1
fi

for item in "$SRC"/*; do
  [ -e "$item" ] || continue
  name="$(basename "$item")"
  case "$name" in persistent | .env | .git) continue ;; esac
  rm -rf "$INSTALL/$name"
  cp -a "$item" "$INSTALL/"
done

rm -rf "$ARCHIVE" "$EXTRACT"

export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT="${HOST_PORT:-3001}"
cd "$INSTALL"
bash deploy/rebuild-vps.sh

echo ""
curl -sf "http://127.0.0.1:${HOST_PORT}/api/health" | grep -E 'gitSha|dbExists|userCount' || true
echo ""
echo ">>> Bitti — tarayıcı Ctrl+Shift+R"
