#!/bin/bash
# Admin oluştur / şifre sıfırla
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/bootstrap-admin.sh | bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
set -eu

INSTALL="${SINEODA_ROOT:-/opt/sineoda}"
if [ ! -d "$INSTALL" ]; then
  echo "HATA: $INSTALL yok — önce: curl -fsSL .../paste-install.sh | bash"
  exit 1
fi
cd "$INSTALL"

ADMIN_EMAIL="admin@plooy.tv"
if [ -f .env ] && grep -qE '^ADMIN_EMAIL=' .env; then
  ADMIN_EMAIL="$(grep -E '^ADMIN_EMAIL=' .env | cut -d= -f2- | tr -d '\r')"
fi

ADMIN_PASS="${ADMIN_BOOTSTRAP_PASSWORD:-admin123}"
if [ -f .env ] && grep -qE '^ADMIN_BOOTSTRAP_PASSWORD=' .env; then
  ADMIN_PASS="$(grep -E '^ADMIN_BOOTSTRAP_PASSWORD=' .env | cut -d= -f2- | tr -d '\r')"
fi
# Test VPS: varsayılan admin123 (production seed'den bağımsız — docker exec ile yazılır)
if [ -z "$ADMIN_PASS" ] || [ "$ADMIN_PASS" = "admin123" ]; then
  ADMIN_PASS="admin123"
fi

if [ -f .env ]; then
  if grep -qE '^ADMIN_BOOTSTRAP_PASSWORD=' .env; then
    sed -i "s|^ADMIN_BOOTSTRAP_PASSWORD=.*|ADMIN_BOOTSTRAP_PASSWORD=${ADMIN_PASS}|" .env
  else
    printf '\nADMIN_BOOTSTRAP_PASSWORD=%s\n' "$ADMIN_PASS" >> .env
  fi
fi

NODE_SCRIPT='const bcrypt=require("bcryptjs");const Database=require("better-sqlite3");const email=process.env.BOOTSTRAP_EMAIL;const password=process.env.BOOTSTRAP_PASS;const db=new Database("/app/server/data/sineoda.db");const hash=bcrypt.hashSync(password,10);const now=new Date().toISOString();const existing=db.prepare("SELECT id FROM users WHERE email = ?").get(email);if(existing){db.prepare("UPDATE users SET password_hash = ?, role = '\''admin'\'', email_verified = 1 WHERE id = ?").run(hash,existing.id);}else{db.prepare("INSERT INTO users (id,name,email,password_hash,role,created_at,email_verified) VALUES (?,?,?,?,'\''admin'\'',?,1)").run("plooy-admin","Plooy Admin",email,hash,now);}console.log("admin ok");'

pick_container() {
  local name=""
  name="$(docker ps --format '{{.Names}}' | grep -iE 'sineoda|plooy' | head -1 || true)"
  if [ -n "$name" ]; then echo "$name"; return; fi
  name="$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '3001->|:3001->' | cut -f1 | head -1 || true)"
  if [ -n "$name" ]; then echo "$name"; return; fi
  name="$(docker ps --format '{{.Names}}' | head -1 || true)"
  echo "$name"
}

CONTAINER="$(pick_container)"
if [ -z "$CONTAINER" ]; then
  echo "HATA: hiç container yok. Önce kurulum:"
  echo "  curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/paste-install.sh | bash"
  docker ps -a || true
  exit 1
fi

echo ">>> container: $CONTAINER"

if ! docker exec -T -w /app/server \
  -e "BOOTSTRAP_EMAIL=$ADMIN_EMAIL" \
  -e "BOOTSTRAP_PASS=$ADMIN_PASS" \
  "$CONTAINER" node -e "$NODE_SCRIPT"; then
  echo "HATA: admin oluşturulamadı — docker logs $CONTAINER | tail -20"
  docker logs "$CONTAINER" 2>&1 | tail -20 || true
  exit 1
fi

echo ""
echo "============================================"
echo "  Admin giriş"
echo "  E-posta:  $ADMIN_EMAIL"
echo "  Şifre:    $ADMIN_PASS"
echo "============================================"
echo "http://31.42.127.26/admin/giris — Ctrl+Shift+R"
