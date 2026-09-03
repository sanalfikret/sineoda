#!/usr/bin/env bash
# Aylık izlenme muhasebesi devri — geçen ayı kapatır, güncel ayı açar.
# VPS cron (İstanbul 00:05, her gün — ay başında kaçırılırsa ertesi gün de yakalar):
#   5 0 * * * TZ=Europe/Istanbul cd /opt/sineoda && bash deploy/cron-monthly-rollover.sh >> /var/log/sineoda-rollover.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_URL="${CRON_API_URL:-http://127.0.0.1:3001}"
ENDPOINT="${API_URL%/}/api/internal/cron/watch-accounting/rollover"

CURL_ARGS=(-fsS -X POST "$ENDPOINT")
if [ -n "${CRON_SECRET:-}" ]; then
  CURL_ARGS+=(-H "Authorization: Bearer ${CRON_SECRET}")
fi

echo "[$(date -Iseconds)] watch-accounting rollover..."
curl "${CURL_ARGS[@]}"
echo ""
