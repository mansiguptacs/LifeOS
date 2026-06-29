#!/usr/bin/env bash
# Manage the self-contained local Postgres cluster for AccessMap AI dev.
set -euo pipefail
export PATH="/Library/PostgreSQL/17/bin:$PATH"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$DIR/.pgdata"
case "${1:-}" in
  start) pg_ctl -D "$PGDATA" -o "-p 5432" -l "$PGDATA/logfile" start ;;
  stop)  pg_ctl -D "$PGDATA" stop ;;
  status) pg_isready -h localhost -p 5432 ;;
  *) echo "usage: scripts/db.sh {start|stop|status}" ; exit 1 ;;
esac
