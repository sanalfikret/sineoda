#!/bin/bash
# SIFIR VPS — Ubuntu format sonrası tek komut (git gerekmez)
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/paste-install.sh | bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

INSTALL="/opt/sineoda"
ARCHIVE="/tmp/sineoda-main.tar.gz"
EXTRACT="/tmp/sineoda-extract"

echo "=== 1) paketler ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates nginx tar

if ! command -v docker >/dev/null 2>&1; then
  echo ">>> Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
fi

echo "=== 2) nginx ==="
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
cat > /etc/nginx/sites-available/plooy << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 100M;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/plooy /etc/nginx/sites-enabled/plooy
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "=== 3) kod indir (GitHub arşiv) ==="
rm -rf "$EXTRACT" "$ARCHIVE" 2>/dev/null || true
mkdir -p "$EXTRACT" "$INSTALL/persistent/data" "$INSTALL/persistent/uploads"
curl -fsSL "https://github.com/sanalfikret/sineoda/archive/refs/heads/main.tar.gz" -o "$ARCHIVE"
tar -xzf "$ARCHIVE" -C "$EXTRACT"
SRC="$(find "$EXTRACT" -maxdepth 1 -type d -name 'sineoda-main*' | head -1)"
if [ -z "$SRC" ] || [ ! -f "$SRC/server/src/index.ts" ]; then
  echo "HATA: arşiv bozuk."
  exit 1
fi
# Temiz kurulum — eski bozuk klasör varsa yedekle
if [ -d "$INSTALL/server" ]; then
  mv "$INSTALL" "/opt/sineoda-old-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || rm -rf "$INSTALL"
  mkdir -p "$INSTALL/persistent/data" "$INSTALL/persistent/uploads"
fi
cp -a "$SRC"/. "$INSTALL/"
rm -rf "$ARCHIVE" "$EXTRACT"

echo "=== 4) .env ==="
if [ ! -f "$INSTALL/.env" ]; then
  cp "$INSTALL/config/env.example" "$INSTALL/.env"
  IP="$(curl -fsSL -4 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
  JWT="$(head -c 48 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 48)"
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=http://${IP}|" "$INSTALL/.env"
  sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=http://${IP}|" "$INSTALL/.env"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" "$INSTALL/.env"
  sed -i "s|^PERSIST_DIR=.*|PERSIST_DIR=${INSTALL}/persistent|" "$INSTALL/.env"
  ADMIN_PASS="PlooyTest$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)"
  if grep -qE '^ADMIN_BOOTSTRAP_PASSWORD=' "$INSTALL/.env"; then
    sed -i "s|^ADMIN_BOOTSTRAP_PASSWORD=.*|ADMIN_BOOTSTRAP_PASSWORD=${ADMIN_PASS}|" "$INSTALL/.env"
  else
    printf '\nADMIN_BOOTSTRAP_PASSWORD=%s\n' "$ADMIN_PASS" >> "$INSTALL/.env"
  fi
  echo ">>> .env oluşturuldu (IP: $IP)"
  echo ">>> Admin şifresi kurulum sonunda bootstrap-admin ile yazdırılacak"
  BOOTSTRAP_ADMIN_PASS="$ADMIN_PASS"
  BOOTSTRAP_ADMIN_EMAIL="admin@plooy.tv"
fi

echo "=== 5) docker rebuild ==="
export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT=3001
cd "$INSTALL"
/bin/bash deploy/rebuild-vps.sh

echo ""
echo "=== 6) admin ==="
/bin/bash deploy/bootstrap-admin.sh 2>/dev/null || true

echo ""
echo "=== 7) bitti ==="
curl -sf "http://127.0.0.1:3001/api/health" | grep -E 'gitSha|dbExists|userCount' || true
echo ""
echo ">>> Tarayıcı: Ctrl+Shift+R  http://$(curl -fsSL -4 ifconfig.me 2>/dev/null || echo 31.42.127.26)/admin/giris"
