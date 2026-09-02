#!/usr/bin/env bash
# Git kimlik doğrulama patladığında: GitHub'dan arşiv indir (public repo, token gerekmez)
# cd /opt/sineoda && bash deploy/pull-github-archive.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE="/tmp/sineoda-main-$$.tar.gz"
EXTRACT="/tmp/sineoda-main-$$"

cleanup() {
  rm -rf "$ARCHIVE" "$EXTRACT" 2>/dev/null || true
}
trap cleanup EXIT

echo ">>> GitHub main arşivi indiriliyor..."
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"

echo ">>> açılıyor..."
mkdir -p "$EXTRACT"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ]; then
  echo "HATA: arşiv içinde sineoda-main bulunamadı."
  exit 1
fi

echo ">>> dosyalar kopyalanıyor (persistent/.env korunur)..."
if ! command -v rsync >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq rsync 2>/dev/null || true
fi
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
  --exclude persistent \
  --exclude .env \
  --exclude node_modules \
  --exclude server/node_modules \
  --exclude dist \
  --exclude .git \
  "$SRC/" "$ROOT/"
else
  for item in "$SRC"/*; do
    name="$(basename "$item")"
    case "$name" in persistent|.env) continue ;; esac
    rm -rf "$ROOT/$name"
    cp -a "$item" "$ROOT/"
  done
fi

SHA="$(git rev-parse --short HEAD 2>/dev/null || echo archive)"
if [ -d .git ]; then
  git rev-parse --short HEAD 2>/dev/null || true
fi
echo ">>> OK — kaynak güncellendi (git olmadan)."
echo "Sonraki: bash deploy/rebuild-vps.sh"
