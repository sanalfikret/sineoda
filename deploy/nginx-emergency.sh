#!/usr/bin/env bash
# Proje klasörü olmadan nginx düzelt — PuTTY: curl -fsSL .../nginx-emergency.sh | bash
set -euo pipefail

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
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl reload nginx
echo ">>> nginx OK — 80 -> 127.0.0.1:3001"
curl -sf -o /dev/null -w "localhost: %{http_code}\n" http://127.0.0.1:3001/api/health || echo "UYARI: 3001 kapali — once container baslat"
