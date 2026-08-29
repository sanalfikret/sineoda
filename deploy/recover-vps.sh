#!/usr/bin/env bash
# ACİL 502 kurtarma — /opt/sineoda içinde: bash deploy/recover-vps.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${SINEODA_SKIP_GIT_PULL:-}" != "1" ]; then
  echo ">>> git pull"
  git pull
fi

bash deploy/rebuild-vps.sh
