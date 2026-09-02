#!/usr/bin/env bash
# VPS'te git pull "Permission denied" veya şifre sorunu — bir kez çalıştır.
# cd /opt/sineoda && bash deploy/fix-git-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OWNER="$(whoami)"
echo ">>> .git sahipliği: $OWNER"
if [ -d .git ]; then
  chown -R "$OWNER:$OWNER" .git
  chmod -R u+rwX .git
fi

# Public repo — kimlik doğrulama gerektirmesin
git remote set-url origin https://github.com/sanalfikret/sineoda.git
git config --local --unset credential.helper 2>/dev/null || true

echo ">>> git fetch origin main"
GIT_TERMINAL_PROMPT=0 git fetch origin main
git reset --hard origin/main

echo ">>> OK — HEAD: $(git rev-parse --short HEAD)"
echo "Sonraki: bash deploy/rebuild-vps.sh"
