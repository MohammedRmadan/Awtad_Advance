#!/usr/bin/env bash
# Awtad BD Hub – day-to-day management.  Installed as /usr/local/bin/bdhub by install.sh.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/../.." && pwd)"
cd "$APP_DIR"
dc() { docker compose "$@"; }

usage() {
  cat <<'EOF'
Usage: bdhub <command>
  status                 containers and health
  logs [service]         follow logs (app | db | caddy | backup)
  start | stop | restart start / stop / restart everything (restart also applies .env changes)
  update                 rebuild from the current folder after copying a new version in, keep all data
  backup                 make a backup now (database + attachments) into ./backups
  backups                list backups
  restore <db.dump> [uploads.tar.gz]   restore a backup (replaces current data)
  reset-admin [username] give an administrator a new temporary password (default: admin)
  psql                   open the database console
EOF
}

cmd="${1:-}"; shift || true
case "$cmd" in
  status)  dc ps; echo; dc exec -T app wget -qO- http://127.0.0.1:8080/healthz && echo "  <- application healthy" ;;
  logs)    dc logs -f --tail=200 "${1:-app}" ;;
  start)   dc up -d ;;
  stop)    dc stop ;;
  restart) dc up -d --force-recreate ;;
  update)
    echo "Backing up first..."; dc exec -T backup sh /backup.sh
    dc up -d --build --remove-orphans
    dc exec -T app node scripts/seed.js >/dev/null
    docker image prune -f >/dev/null
    echo "Updated."; dc ps ;;
  backup)  dc exec -T backup sh /backup.sh; ls -lh backups | tail -n 4 ;;
  backups) ls -lh backups ;;
  restore)
    DUMP="${1:-}"; UPL="${2:-}"
    [ -f "$DUMP" ] || { echo "Give the .dump file, e.g.  bdhub restore backups/bdhub-20261015-0215.dump backups/uploads-20261015-0215.tar.gz"; exit 1; }
    read -r -p "This REPLACES the current data with $DUMP. Type YES to continue: " ok
    [ "$ok" = "YES" ] || { echo "Cancelled."; exit 1; }
    echo "Safety backup of the current data..."; dc exec -T backup sh /backup.sh
    dc stop app
    dc exec -T db pg_restore -U bdhub -d bdhub --clean --if-exists --no-owner < "$DUMP"
    if [ -n "$UPL" ]; then
      [ -f "$UPL" ] || { echo "Attachments file not found: $UPL"; exit 1; }
      dc run --rm --no-deps -T --entrypoint sh app -c 'tar -xzf - -C /data/uploads' < "$UPL"
    fi
    dc start app; echo "Restored." ;;
  reset-admin) dc exec -T app node scripts/admin-password.js "${1:-admin}" ;;
  psql)    dc exec db psql -U bdhub -d bdhub ;;
  ""|-h|--help|help) usage ;;
  *) echo "Unknown command: $cmd"; usage; exit 1 ;;
esac
