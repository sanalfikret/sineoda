#!/usr/bin/env bash
# VPS'te proje klasörünü bul — PuTTY: bash deploy/find-vps-project.sh
set -euo pipefail

echo ">>> Docker container"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "(docker yok)"

echo ""
echo ">>> rebuild-vps.sh aranıyor..."
FOUND=()
while IFS= read -r path; do
  FOUND+=("$path")
  dir="$(dirname "$(dirname "$path")")"
  echo "  $dir"
done < <(find /root /opt /home -maxdepth 4 -path '*/deploy/rebuild-vps.sh' 2>/dev/null | sort -u)

if [ ${#FOUND[@]} -eq 0 ]; then
  echo ""
  echo "HATA: Proje bulunamadı."
  echo "  ls -la ~/plooy /opt/sineoda"
  exit 1
fi

BEST="$(dirname "$(dirname "${FOUND[0]}")")"
echo ""
echo ">>> Önerilen: cd $BEST"
