#!/usr/bin/env bash
set -euo pipefail

backup_url="${BACKUP_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "$backup_url" ]]; then
  echo "BACKUP_DATABASE_URL or DATABASE_URL is required" >&2
  exit 1
fi
if [[ "$backup_url" == *"-pooler."* ]]; then
  echo "Use Neon's unpooled connection string for BACKUP_DATABASE_URL" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/tiny-treasures-$timestamp.dump"

pg_dump --format=custom --no-owner --no-acl "$backup_url" --file="$output"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  remote_path="s3://$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-database-backups}/$(basename "$output")"
  aws s3 cp "$output" "$remote_path" --only-show-errors
  echo "Uploaded backup: $remote_path"
fi

find "$BACKUP_DIR" -type f -name 'tiny-treasures-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "$output"
