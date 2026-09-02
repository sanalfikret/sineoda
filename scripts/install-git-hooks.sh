#!/usr/bin/env bash
# Bir kez: bash scripts/install-git-hooks.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="$ROOT/.git/hooks"
mkdir -p "$HOOK_DIR"
for hook in prepare-commit-msg pre-commit commit-msg; do
  cp "$ROOT/scripts/git-hooks/$hook" "$HOOK_DIR/$hook"
  chmod +x "$HOOK_DIR/$hook"
done
echo "Git hook kuruldu: prepare-commit-msg, pre-commit, commit-msg"
echo "  - Co-authored-by / Cursor attribution commit'e giremez"
echo "  - Author cursoragent@cursor.com olamaz"
