#!/usr/bin/env bash
# Script Backup Database PostgreSQL COMPASS
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/compass_db_backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"compass"}
DB_NAME=${DB_NAME:-"compass_db"}

echo "Memulai backup database $DB_NAME dari $DB_HOST:$DB_PORT..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

echo "Backup berhasil disimpan di: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
