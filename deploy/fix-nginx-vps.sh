#!/usr/bin/env bash
# nginx bozulduysa (server_name is not allowed here): bash deploy/fix-nginx-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$ROOT/deploy/nginx-Plooy.conf"

if [ ! -f "$CONF" ]; then
  echo "HATA: $CONF yok — önce cd /opt/Plooy"
  exit 1
fi

mkdir -p /etc/appsecrets-sealed 2>/dev/null || true

cp "$CONF" /etc/nginx/sites-available/plooy
ln -sf /etc/nginx/sites-available/plooy /etc/nginx/sites-enabled/plooy
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx
echo ">>> nginx OK — proxy http://127.0.0.1:3001"
