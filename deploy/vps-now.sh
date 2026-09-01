#!/usr/bin/env bash
# Deprecated alias — use deploy/recover-vps.sh
exec bash "$(dirname "$0")/recover-vps.sh" "$@"
