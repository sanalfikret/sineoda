#!/bin/bash
# Tek komut güncelle — recover-from-archive ile aynı güvenli yöntem
# PuTTY: curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/paste-update.sh | /bin/bash
set -eu
exec /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh)"
