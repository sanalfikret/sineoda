#!/bin/bash
# Admin oluştur / şifre sıfırla — test: admin123
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/bootstrap-admin.sh | bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

INSTALL="${SINEODA_ROOT:-/opt/sineoda}"
ADMIN_EMAIL="admin@plooy.tv"
ADMIN_PASS="admin123"

CONTAINER="$(docker ps --format '{{.Names}}' | grep -iE 'sineoda|plooy' | head -1 || true)"
if [ -z "$CONTAINER" ]; then
  CONTAINER="$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '3001->|:3001->' | cut -f1 | head -1 || true)"
fi
if [ -z "$CONTAINER" ]; then
  CONTAINER="$(docker ps --format '{{.Names}}' | head -1 || true)"
fi

if [ -z "$CONTAINER" ]; then
  echo "HATA: container yok. docker ps -a:"
  docker ps -a || true
  exit 1
fi

echo ">>> container: $CONTAINER"

run_bootstrap() {
  docker exec "$CONTAINER" sh -c \
    "BOOTSTRAP_EMAIL='$ADMIN_EMAIL' BOOTSTRAP_PASS='$ADMIN_PASS' node /app/server/scripts/bootstrap-admin.js"
}

if ! run_bootstrap 2>/dev/null; then
  echo ">>> script dosyası yok — inline node"
  docker exec "$CONTAINER" sh -c "cd /app/server && BOOTSTRAP_EMAIL='$ADMIN_EMAIL' BOOTSTRAP_PASS='$ADMIN_PASS' node -e \"
const bcrypt=require('bcryptjs');
const Database=require('better-sqlite3');
const email=process.env.BOOTSTRAP_EMAIL;
const password=process.env.BOOTSTRAP_PASS;
const db=new Database('/app/server/data/sineoda.db');
const hash=bcrypt.hashSync(password,10);
const now=new Date().toISOString();
const existing=db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if(existing){
  db.prepare('UPDATE users SET password_hash = ?, role = ?, email_verified = 1 WHERE id = ?').run(hash,'admin',existing.id);
}else{
  db.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at,email_verified) VALUES (?,?,?,?,?,?,1)').run('plooy-admin','Plooy Admin',email,hash,'admin',now);
}
console.log('admin ok');
\""
fi

if [ -d "$INSTALL" ] && [ -f "$INSTALL/.env" ]; then
  if grep -qE '^ADMIN_BOOTSTRAP_PASSWORD=' "$INSTALL/.env"; then
    sed -i "s|^ADMIN_BOOTSTRAP_PASSWORD=.*|ADMIN_BOOTSTRAP_PASSWORD=${ADMIN_PASS}|" "$INSTALL/.env"
  else
    printf '\nADMIN_BOOTSTRAP_PASSWORD=%s\n' "$ADMIN_PASS" >> "$INSTALL/.env"
  fi
fi

IP="$(curl -fsSL -4 ifconfig.me 2>/dev/null || echo 31.42.127.26)"
echo ""
echo "============================================"
echo "  E-posta:  $ADMIN_EMAIL"
echo "  Şifre:    $ADMIN_PASS"
echo "  URL:      http://${IP}/admin/giris"
echo "============================================"
curl -sf "http://127.0.0.1:3001/api/health" | grep -E 'userCount|dbExists' || true
