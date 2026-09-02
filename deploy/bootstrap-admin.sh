#!/bin/bash
# Admin oluştur / şifre sıfırla — test: admin123
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/bootstrap-admin.sh | bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

INSTALL="${SINEODA_ROOT:-/opt/sineoda}"
ADMIN_EMAIL="admin@plooy.tv"
ADMIN_PASS="admin123"
DB_DIR="${INSTALL}/persistent/data"

CONTAINER="$(docker ps -a --format '{{.Names}}' | grep -iE 'sineoda|plooy' | head -1 || true)"
if [ -z "$CONTAINER" ]; then
  CONTAINER="$(docker ps -a --format '{{.Names}}' | head -1 || true)"
fi

if [ -z "$CONTAINER" ]; then
  echo "HATA: container yok."
  docker ps -a || true
  exit 1
fi

IMAGE="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)"
if [ -z "$IMAGE" ] || [ "$IMAGE" = "<no value>" ]; then
  IMAGE="$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -i sineoda | head -1 || true)"
fi

echo ">>> container: $CONTAINER  image: $IMAGE"
mkdir -p "$DB_DIR"

# Çalışan API bellekte DB tutuyor — yazmadan önce durdur
docker stop "$CONTAINER" >/dev/null 2>&1 || true

run_bootstrap() {
  docker run --rm \
    -w /app/server \
    -e "BOOTSTRAP_EMAIL=$ADMIN_EMAIL" \
    -e "BOOTSTRAP_PASS=$ADMIN_PASS" \
    -e "DATA_DIR=/app/server/data" \
    -v "${DB_DIR}:/app/server/data" \
    "$IMAGE" \
    node scripts/bootstrap-admin.js
}

if ! run_bootstrap 2>/dev/null; then
  echo ">>> script yok — inline (sql.js)"
  docker run --rm \
    -w /app/server \
    -e "BOOTSTRAP_EMAIL=$ADMIN_EMAIL" \
    -e "BOOTSTRAP_PASS=$ADMIN_PASS" \
    -v "${DB_DIR}:/app/server/data" \
    "$IMAGE" \
    node --input-type=module -e "
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
const email=process.env.BOOTSTRAP_EMAIL;
const password=process.env.BOOTSTRAP_PASS;
const dbPath=path.join('/app/server/data','sineoda.db');
const SQL=await initSqlJs();
const db=fs.existsSync(dbPath)?new SQL.Database(fs.readFileSync(dbPath)):new SQL.Database();
const hash=bcrypt.hashSync(password,10);
const now=new Date().toISOString();
const s=db.prepare('SELECT id FROM users WHERE email = ?');
s.bind([email]);
const id=s.step()?s.getAsObject().id:null;
s.free();
if(id) db.run('UPDATE users SET password_hash=?, role=?, email_verified=1 WHERE id=?',[hash,'admin',id]);
else db.run('INSERT INTO users (id,name,email,password_hash,role,created_at,email_verified) VALUES (?,?,?,?,?,?,1)',['plooy-admin','Plooy Admin',email,hash,'admin',now]);
fs.writeFileSync(dbPath,Buffer.from(db.export()));
console.log('admin ok');
"
fi

docker start "$CONTAINER" >/dev/null 2>&1 || true

for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:3001/api/health" >/dev/null 2>&1; then break; fi
  sleep 2
done

if [ -f "$INSTALL/.env" ]; then
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
