#!/usr/bin/env bash
#
# Respaldo diario de la base de datos y las imágenes subidas.
# Los uploads NO están en git: si se pierde la carpeta, se pierden las imágenes.
#
# Instalar en cron (como root):
#   0 2 * * * /srv/autopartes-air/deploy/backup.sh >> /var/log/autopartes-backup.log 2>&1
set -euo pipefail

APP_DIR=/srv/autopartes-air
BACKUP_DIR=/var/backups/autopartes-air
RETENTION_DAYS=14
STAMP=$(date +%Y%m%d-%H%M)

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Respaldando base de datos…"
sudo -u postgres pg_dump --no-owner 'autopartes-air' | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

echo "[$(date -Is)] Respaldando uploads…"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$APP_DIR/apps/server" uploads

echo "[$(date -Is)] Borrando respaldos de más de $RETENTION_DAYS días…"
find "$BACKUP_DIR" -type f -name '*.gz' -mtime "+$RETENTION_DAYS" -delete

echo "[$(date -Is)] ✅ Respaldo completado"
