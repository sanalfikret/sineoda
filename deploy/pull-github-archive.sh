#!/bin/bash
# Git kimlik doğrulama patladığında: GitHub arşivinden güncelle (token gerekmez)
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/pull-github-archive.sh | bash
# veya: cd /opt/sineoda && bash deploy/pull-github-archive.sh
set -eu

ROOT="${SINEODA_ROOT:-/opt/sineoda}"
if [ -f "${BASH_SOURCE[0]:-}" ] && [ -d "$(dirname "$BASH_SOURCE[0]")/.." ]; then
  SCRIPT_ROOT="$(cd "$(dirname "$BASH_SOURCE[0]")/.." && pwd)"
  if [ -f "$SCRIPT_ROOT/deploy/rebuild-vps.sh" ]; then
    ROOT="$SCRIPT_ROOT"
  fi
fi

case "$ROOT" in
  *sineoda-main*|*sinoda-main*)
    echo "HATA: Yanlış klasör ($ROOT). Önce: cd /opt/sineoda"
    echo "Kurulum yoksa: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/vps-rescue.sh | bash"
    exit 1
    ;;
esac

mkdir -p "$ROOT/persistent/data" "$ROOT/persistent/uploads"
cd "$ROOT"

ARCHIVE="/tmp/sineoda-main-$$.tar.gz"
EXTRACT="/tmp/sineoda-extract-$$"

cleanup() {
  rm -rf "$ARCHIVE" "$EXTRACT" 2>/dev/null || true
}
trap cleanup EXIT

echo ">>> hedef: $ROOT"
echo ">>> GitHub main arşivi indiriliyor..."
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"

echo ">>> açılıyor..."
mkdir -p "$EXTRACT"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d \( -name 'sineoda-main' -o -name 'sineoda-main-*' \) | head -1)"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "HATA: arşiv içinde sineoda-main bulunamadı."
  exit 1
fi

echo ">>> dosyalar kopyalanıyor (persistent/.env korunur, rsync yok)..."
copied=0
for item in "$SRC"/*; do
  [ -e "$item" ] || continue
  name="$(basename "$item")"
  case "$name" in
    persistent | .env | .git) continue ;;
  esac
  rm -rf "$ROOT/$name"
  cp -a "$item" "$ROOT/"
  copied=$((copied + 1))
done

if [ "$copied" -lt 5 ]; then
  echo "HATA: çok az dosya kopyalandı ($copied) — hedef klasörü kontrol et."
  exit 1
fi

echo ">>> OK — $copied öğe güncellendi."
echo "Sonraki: cd $ROOT && bash deploy/rebuild-vps.sh"
