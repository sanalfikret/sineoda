#!/usr/bin/env bash
# /opt/sineoda içinde: bash deploy/update-vps.sh
# GitHub'dan çeker + rebuild. GitHub'sız: PC'den deploy/sync-to-vps.ps1 kullanın.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  chown -R "$(whoami)" .git 2>/dev/null || true
fi

if [ "${SINEODA_SKIP_GIT_PULL:-}" = "1" ]; then
  echo ">>> git pull atlandı (kod zaten güncellendi)"
else
  echo ">>> git pull"
  git pull
fi

bash deploy/rebuild-vps.sh
