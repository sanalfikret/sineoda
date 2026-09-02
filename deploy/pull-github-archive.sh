#!/bin/bash
# Git kimlik doğrulama patladığında — recover-from-archive kullan (daha güvenli)
# cd /opt/sineoda && bash deploy/pull-github-archive.sh
exec /bin/bash "$(dirname "$0")/recover-from-archive.sh" 2>/dev/null || \
  exec /bin/bash -c 'curl -fsSL https://raw.githubusercontent.com/sanalfikret/sineoda/main/deploy/recover-from-archive.sh | /bin/bash'
