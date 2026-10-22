#!/bin/sh
# Nightly backup: database dump + attachments archive, keeps KEEP_DAYS days.
set -eu
TS=$(date +%Y%m%d-%H%M)
pg_dump -h db -U bdhub -d bdhub -Fc -f /backups/bdhub-$TS.dump
tar -czf /backups/uploads-$TS.tar.gz -C /uploads .
find /backups -name 'bdhub-*.dump' -mtime +"${KEEP_DAYS:-30}" -delete
find /backups -name 'uploads-*.tar.gz' -mtime +"${KEEP_DAYS:-30}" -delete
echo "$(date) backup ok: $TS"
