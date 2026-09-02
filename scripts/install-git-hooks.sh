#!/usr/bin/env bash
# Bir kez: bash scripts/install-git-hooks.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="$ROOT/.git/hooks"
mkdir -p "$HOOK_DIR"
cp "$ROOT/scripts/git-hooks/prepare-commit-msg" "$HOOK_DIR/prepare-commit-msg"
chmod +x "$HOOK_DIR/prepare-commit-msg"
echo "Git hook kuruldu: prepare-commit-msg (Cursor co-author satırı commit'e girmez)"
