#!/usr/bin/env bash
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/paste-install.sh | bash
set -euo pipefail

echo "=== nginx temizle ==="
rm -f /etc/nginx/sites-enabled/*.save /etc/nginx/sites-enabled/default 2>/dev/null || true

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
systemctl reload nginx
echo "nginx OK"

echo "=== git + proje ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates

INSTALL=/opt/sineoda
mkdir -p "$INSTALL/persistent/data" "$INSTALL/persistent/uploads"

if [ ! -d "$INSTALL/.git" ]; then
  git clone https://github.com/sanalfikret/sineoda.git "$INSTALL"
fi

cd "$INSTALL"
git fetch origin main
git reset --hard origin/main

echo "=== eski DB kurtar ==="
if [ ! -f "$INSTALL/persistent/data/sineoda.db" ]; then
  for cid in $(docker ps -aq 2>/dev/null); do
    src=$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/server/data"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)
    if [ -n "$src" ] && [ -f "$src/sineoda.db" ]; then
      cp -a "$src/sineoda.db" "$INSTALL/persistent/data/"
      echo "DB: $src/sineoda.db"
      break
    fi
  done
fi

echo "=== docker rebuild ==="
export PERSIST_DIR="$INSTALL/persistent"
export HOST_PORT=3001
docker stop sineoda-app-1 sineoda-api-1 plooy-web plooy-db 2>/dev/null || true
docker rm -f sineoda-app-1 sineoda-api-1 plooy-web plooy-db 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null || true
bash deploy/rebuild-vps.sh

echo ""
curl -sf "http://127.0.0.1:3001/api/health" | grep -E 'gitSha|dbExists|userCount' || true
echo ""
docker ps
echo ">>> Bitti — tarayici Ctrl+Shift+R"
