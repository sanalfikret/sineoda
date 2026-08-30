#!/usr/bin/env bash
# Ubuntu/Debian VPS — Docker ile Plooy kurulumu
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

if [ ! -f .env ]; then
  cp deploy/env.production.example .env
  echo ""
  echo ">>> .env oluşturuldu. JWT_SECRET, FRONTEND_URL ve PUBLIC_URL değerlerini düzenle:"
  echo "    nano .env"
  echo ""
  exit 1
fi

docker compose build --no-cache
docker compose up -d

echo ""
echo "Kurulum tamam. Sağlık kontrolü:"
sleep 3
curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" | head -c 200 || true
echo ""
echo "Site: docker compose logs -f Plooy"
