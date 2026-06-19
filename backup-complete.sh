#!/bin/bash

# Complete backup script - includes database and Supabase files

set -e

# Load environment variables
if [ -f .env.backend ]; then
  export $(cat .env.backend | xargs)
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set in .env.backend"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ ERROR: SUPABASE_URL or SUPABASE_KEY not set in .env.backend"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting complete backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# ============ Database Backup ============
echo "📊 Backing up PostgreSQL database..."
DB_DUMP="$BACKUP_DIR/database.sql"

pg_dump "$DATABASE_URL" > "$DB_DUMP" 2>/dev/null || {
  echo "❌ Failed to backup database. Make sure pg_dump is installed:"
  echo "   macOS: brew install postgresql"
  echo "   Ubuntu: sudo apt-get install postgresql-client"
  exit 1
}

DB_SIZE=$(du -h "$DB_DUMP" | cut -f1)
echo "✅ Database backed up: $DB_SIZE"

# ============ Files Backup ============
echo ""
echo "📦 Backing up Supabase storage files..."
npx tsx backup-files.ts

if [ $? -eq 0 ]; then
  echo "✅ Files backup completed"
else
  echo "⚠️  Files backup encountered issues"
fi

# ============ Create manifest ============
MANIFEST="$BACKUP_DIR/manifest.json"
cat > "$MANIFEST" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_timestamp": "$TIMESTAMP",
  "supabase_url": "$SUPABASE_URL",
  "bucket": "${SUPABASE_BUCKET:-imageStore}",
  "database_url_host": "$(echo $DATABASE_URL | grep -oP '(?<=@)[^/]+' || echo 'unknown')",
  "contents": {
    "database": "database.sql",
    "files": "files/",
    "file_list": "file_list.json"
  }
}
EOF

echo ""
echo "✅ Manifest created"

# ============ Create final archive ============
echo ""
echo "📦 Creating backup archive..."

ARCHIVE_NAME="joe-main-backup-$TIMESTAMP.tar.gz"
cd ./backups
tar -czf "$ARCHIVE_NAME" "$TIMESTAMP"
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
cd -

echo "✅ Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)"

# ============ Summary ============
echo ""
echo "========================================"
echo "🎉 BACKUP COMPLETE"
echo "========================================"
echo ""
echo "📍 Archive location: ./backups/$ARCHIVE_NAME"
echo ""
echo "📦 Contents:"
echo "  - database.sql      PostgreSQL database dump"
echo "  - files/            All Supabase storage files"
echo "  - manifest.json     Backup metadata"
echo ""
echo "📝 Instructions for restoration:"
echo ""
echo "1. Extract the archive:"
echo "   tar -xzf ./backups/$ARCHIVE_NAME"
echo ""
echo "2. Restore the database to new host:"
echo "   psql <NEW_DATABASE_URL> < ./backups/$TIMESTAMP/database.sql"
echo ""
echo "3. Upload files to new Supabase bucket:"
echo "   npx tsx restore-files.ts"
echo ""
echo "========================================"
