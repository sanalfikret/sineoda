#!/usr/bin/env bash
# VPS'te git pull "Authentication failed" veya şifre sorunu — bir kez çalıştır.
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

# Eski/bozuk kimlik bilgilerini temizle (public repo — token gerekmez)
git remote set-url origin https://github.com/sanalfikret/sineoda.git
git config --local credential.helper ""
git config --local --unset credential.helper 2>/dev/null || true
git config --global --unset credential.helper 2>/dev/null || true
rm -f "${HOME}/.git-credentials" 2>/dev/null || true

echo ">>> git fetch origin main (kimlik doğrulama kapalı)"
export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=/bin/false
git fetch origin main
git reset --hard origin/main

SHA="$(git rev-parse --short HEAD)"
echo ">>> OK — HEAD: $SHA"
echo "Sonraki: bash deploy/rebuild-vps.sh"
