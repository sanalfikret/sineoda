#!/bin/bash
# Admin oluştur / şifre sıfırla — format sonrası veya giriş yapılamıyorsa
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/bootstrap-admin.sh | bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

INSTALL="${SINEODA_ROOT:-/opt/sineoda}"
cd "$INSTALL"

if [ ! -f .env ]; then
  echo "HATA: $INSTALL/.env yok"
  exit 1
fi

ADMIN_EMAIL="$(grep -E '^ADMIN_EMAIL=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@plooy.tv}"

ADMIN_PASS="$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 14)"
ADMIN_PASS="PlooyTest${ADMIN_PASS}"

if grep -qE '^ADMIN_BOOTSTRAP_PASSWORD=' .env; then
  sed -i "s|^ADMIN_BOOTSTRAP_PASSWORD=.*|ADMIN_BOOTSTRAP_PASSWORD=${ADMIN_PASS}|" .env
else
  printf '\nADMIN_BOOTSTRAP_PASSWORD=%s\n' "$ADMIN_PASS" >> .env
fi

if ! docker ps --format '{{.Names}}' | grep -qx sineoda; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep -E 'sineoda' | head -1 || true)"
  if [ -z "$CONTAINER" ]; then
    echo "HATA: sineoda container çalışmıyor — docker ps ile kontrol edin"
    exit 1
  fi
else
  CONTAINER="sineoda"
fi

docker exec \
  -e "BOOTSTRAP_EMAIL=$ADMIN_EMAIL" \
  -e "BOOTSTRAP_PASS=$ADMIN_PASS" \
  "$CONTAINER" node -e "
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const email = process.env.BOOTSTRAP_EMAIL;
const password = process.env.BOOTSTRAP_PASS;
const db = new Database('/app/server/data/sineoda.db');
const hash = bcrypt.hashSync(password, 10);
const now = new Date().toISOString();
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare(\"UPDATE users SET password_hash = ?, role = 'admin', email_verified = 1 WHERE id = ?\").run(hash, existing.id);
} else {
  db.prepare(\"INSERT INTO users (id, name, email, password_hash, role, created_at, email_verified) VALUES (?, ?, ?, ?, 'admin', ?, 1)\").run(
    'plooy-admin', 'Plooy Admin', email, hash, now,
  );
}
"

echo ""
echo "============================================"
echo "  Admin giriş"
echo "  E-posta:  $ADMIN_EMAIL"
echo "  Şifre:    $ADMIN_PASS"
echo "============================================"
echo "Tarayıcı: /admin/giris — Ctrl+Shift+R"
