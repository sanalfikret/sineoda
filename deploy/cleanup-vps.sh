#!/usr/bin/env bash
# VPS disk temizliği — Plooy verisine (persistent/) ASLA dokunmaz.
#
#   Rapor (hiçbir şey silmez):   cd /opt/sineoda && bash deploy/cleanup-vps.sh
#   Temizle:                     cd /opt/sineoda && bash deploy/cleanup-vps.sh --apply
#   Derin temizlik (+ en son bozuk kopya, host node_modules):  bash deploy/cleanup-vps.sh --apply --deep
#
# Neyi temizler:
#   - Çalışmayan eski Docker imajları, build önbelleği, durmuş container'lar
#   - /opt/sineoda-broken-*, /opt/sineoda-staging-*, /tmp/sineoda-* (arşiv kurtarma artıkları)
#   - journald günlükleri (200 MB'a indirir), eski sıkıştırılmış /var/log dosyaları, apt önbelleği, npm önbelleği
# Neyi ASLA silmez:
#   - /opt/sineoda/persistent (veritabanı, yüklemeler, yedekler), .env, çalışan container ve imajı, Docker volume'ları
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PERSIST="${PERSIST_DIR:-$ROOT/persistent}"
APPLY=0
DEEP=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --deep) DEEP=1 ;;
    *) echo "Bilinmeyen parametre: $arg"; exit 1 ;;
  esac
done

hr() { echo "------------------------------------------------------------"; }
size_of() { du -sh "$1" 2>/dev/null | cut -f1 || echo "?"; }

echo "=== Plooy VPS temizlik $([ "$APPLY" = 1 ] && echo '(UYGULA)' || echo '(RAPOR — hiçbir şey silinmez)') ==="
echo "Kök dizin: $ROOT"
echo "Veri: $PERSIST  (korunur)"
hr
echo "Disk (önce):"
df -h / | tail -1
FREE_BEFORE=$(df -k / | awk 'NR==2 {print $4}')
hr

# --- Güvenlik: canlı veri sağlıklı mı? (bozuk kopyaları silmeden önce şart)
DB_OK=0
if [ -f "$PERSIST/data/sineoda.db" ] && [ "$(stat -c%s "$PERSIST/data/sineoda.db" 2>/dev/null || echo 0)" -gt 50000 ]; then
  if curl -sf "http://127.0.0.1:${HOST_PORT:-3001}/api/health" 2>/dev/null | grep -q '"dbExists":true'; then
    DB_OK=1
  fi
fi
echo "Canlı veritabanı: $PERSIST/data/sineoda.db ($(size_of "$PERSIST/data/sineoda.db")) — sağlık: $([ "$DB_OK" = 1 ] && echo 'OK' || echo 'DOĞRULANAMADI')"
echo "Yüklemeler: $(size_of "$PERSIST/uploads")   Yedekler: $(size_of "$PERSIST/backups") ($(ls -1 "$PERSIST/backups"/sineoda-*.db 2>/dev/null | wc -l | tr -d ' ') adet, son 30 tutulur)"
hr

# --- 1) Docker
echo "[1] Docker kullanımı:"
docker system df 2>/dev/null || echo "  (docker yok)"
RUNNING_IMAGE="$(docker inspect --format '{{.Image}}' sineoda 2>/dev/null || docker ps --filter name=sineoda --format '{{.Image}}' | head -1 || true)"
echo "  Çalışan container imajı: ${RUNNING_IMAGE:-bulunamadı} (korunur)"
DANGLING=$(docker images -f dangling=true -q 2>/dev/null | wc -l | tr -d ' ')
echo "  Sahipsiz (dangling) imaj: $DANGLING"
if [ "$APPLY" = 1 ]; then
  echo "  -> durmuş container'lar temizleniyor"; docker container prune -f 2>/dev/null || true
  echo "  -> kullanılmayan imajlar temizleniyor (çalışan container'ın imajı kalır)"; docker image prune -af 2>/dev/null || true
  echo "  -> build önbelleği temizleniyor"; docker builder prune -af 2>/dev/null || true
fi
VOLS=$(docker volume ls -q 2>/dev/null | wc -l | tr -d ' ')
echo "  Docker volume sayısı: $VOLS — otomatik SİLİNMEZ (eski verinin orada olma ihtimali). Listelemek için: docker volume ls"
hr

# --- 2) Arşiv kurtarma artıkları
echo "[2] Eski proje kopyaları:"
mapfile -t BROKEN < <(ls -1dt /opt/sineoda-broken-* /opt/sineoda-staging-* 2>/dev/null || true)
if [ "${#BROKEN[@]}" -eq 0 ]; then
  echo "  yok"
else
  for d in "${BROKEN[@]}"; do echo "  $(size_of "$d")  $d"; done
  if [ "$APPLY" = 1 ]; then
    if [ "$DB_OK" != 1 ]; then
      echo "  !! Canlı veritabanı doğrulanamadığı için eski kopyalar SİLİNMEDİ (önce site ayakta olmalı)."
    else
      KEEP_FIRST=$([ "$DEEP" = 1 ] && echo 0 || echo 1)
      idx=0
      for d in "${BROKEN[@]}"; do
        if [ "$idx" -lt "$KEEP_FIRST" ]; then echo "  -> en yeni kopya korundu: $d (silmek için --deep)"; idx=$((idx+1)); continue; fi
        echo "  -> siliniyor: $d"; rm -rf "$d"
        idx=$((idx+1))
      done
    fi
  fi
fi
TMPS=$(ls -1d /tmp/sineoda-* 2>/dev/null | wc -l | tr -d ' ')
echo "  /tmp/sineoda-* artık: $TMPS"
if [ "$APPLY" = 1 ] && [ "$TMPS" -gt 0 ]; then echo "  -> /tmp/sineoda-* siliniyor"; rm -rf /tmp/sineoda-* 2>/dev/null || true; fi
hr

# --- 3) Proje klasöründe gereksizler (Docker içinde build alındığı için host node_modules gerekmez)
echo "[3] Proje klasörü:"
for d in "$ROOT/node_modules" "$ROOT/server/node_modules" "$ROOT/dist" "$ROOT/server/dist"; do
  [ -d "$d" ] && echo "  $(size_of "$d")  $d"
done
if [ "$APPLY" = 1 ] && [ "$DEEP" = 1 ]; then
  for d in "$ROOT/node_modules" "$ROOT/server/node_modules" "$ROOT/dist" "$ROOT/server/dist"; do
    [ -d "$d" ] && { echo "  -> siliniyor (build Docker içinde yapılır): $d"; rm -rf "$d"; }
  done
elif [ "$APPLY" = 1 ]; then
  echo "  (host node_modules/dist için --deep gerekir)"
fi
hr

# --- 4) Sistem günlükleri ve önbellekler
echo "[4] Sistem:"
echo "  journald: $(journalctl --disk-usage 2>/dev/null | grep -oE '[0-9.]+[KMG]' | head -1 || echo '?')"
echo "  /var/log: $(size_of /var/log)   apt önbellek: $(size_of /var/cache/apt)   npm önbellek: $(size_of "${HOME:-/root}/.npm")"
CONTAINER_LOGS=$(du -sch /var/lib/docker/containers/*/*-json.log 2>/dev/null | tail -1 | cut -f1 || echo '?')
echo "  Docker container logları: ${CONTAINER_LOGS:-?} (docker-compose'da 10 MB x 3 sınırı var; eski container loglarını rebuild sıfırlar)"
if [ "$APPLY" = 1 ]; then
  echo "  -> journald 200 MB'a indiriliyor"; journalctl --vacuum-size=200M >/dev/null 2>&1 || true
  echo "  -> 14 günden eski sıkıştırılmış loglar"; find /var/log -type f \( -name '*.gz' -o -name '*.[0-9]' -o -name '*.old' \) -mtime +14 -delete 2>/dev/null || true
  echo "  -> apt önbellek + kullanılmayan paketler"; apt-get clean >/dev/null 2>&1 || true; DEBIAN_FRONTEND=noninteractive apt-get autoremove -y >/dev/null 2>&1 || true
  echo "  -> npm önbelleği"; rm -rf "${HOME:-/root}/.npm/_cacache" 2>/dev/null || true
fi
hr

echo "Disk (sonra):"
df -h / | tail -1
FREE_AFTER=$(df -k / | awk 'NR==2 {print $4}')
if [ "$APPLY" = 1 ]; then
  GAIN_MB=$(( (FREE_AFTER - FREE_BEFORE) / 1024 ))
  echo "Kazanılan alan: ~${GAIN_MB} MB"
  echo "Kontrol: curl -s http://127.0.0.1:${HOST_PORT:-3001}/api/health"
else
  echo "Uygulamak için: bash deploy/cleanup-vps.sh --apply   (en yeni bozuk kopya ve host node_modules için: --apply --deep)"
fi
