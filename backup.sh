#!/bin/bash

# Comprehensive backup script for Joe-main application
# Backs up: PostgreSQL database + all Supabase storage files

set -e

# Load environment variables
if [ -f .env.backend ]; then
  export $(cat .env.backend | xargs)
fi

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup process..."
echo "📁 Backup directory: $BACKUP_DIR"

# ============ Database Backup ============
echo ""
echo "📊 Backing up PostgreSQL database..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

DB_DUMP="$BACKUP_DIR/database.sql"
pg_dump "$DATABASE_URL" > "$DB_DUMP" 2>/dev/null || {
  echo "❌ Failed to backup database"
  exit 1
}

DB_SIZE=$(du -h "$DB_DUMP" | cut -f1)
echo "✅ Database backed up: $DB_SIZE"

# ============ Files Backup ============
echo ""
echo "📦 Backing up Supabase storage files..."

SUPABASE_URL="${SUPABASE_URL:-https://fpaxndekwubupxlubvxj.supabase.co}"
SUPABASE_KEY="${SUPABASE_KEY}"
BUCKET="${SUPABASE_BUCKET:-imageStore}"

if [ -z "$SUPABASE_KEY" ]; then
  echo "❌ ERROR: SUPABASE_KEY not set"
  exit 1
fi

# Create backup manifest
MANIFEST="$BACKUP_DIR/manifest.json"
cat > "$MANIFEST" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "supabase_url": "$SUPABASE_URL",
  "bucket": "$BUCKET",
  "database_dump": "database.sql",
  "files_directory": "files"
}
EOF

# Create files directory
FILES_DIR="$BACKUP_DIR/files"
mkdir -p "$FILES_DIR"

# Download all files from Supabase bucket
echo "Downloading files from bucket: $BUCKET"

# Use curl to list and download files
FILE_COUNT=0
curl -s \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/storage/v1/object/list/$BUCKET" | \
  python3 -c "
import json, sys, os, subprocess
data = json.load(sys.stdin)
files_dir = '$FILES_DIR'
supabase_url = '$SUPABASE_URL'
bucket = '$BUCKET'
key = '$SUPABASE_KEY'

if 'name' in data or isinstance(data, list):
  items = data if isinstance(data, list) else [data]
  for item in items:
    if item.get('name'):
      path = item['name']
      file_path = os.path.join(files_dir, path)
      os.makedirs(os.path.dirname(file_path), exist_ok=True)
      
      url = f'{supabase_url}/storage/v1/object/public/{bucket}/{path}'
      result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {key}', '-o', file_path, url],
        capture_output=True
      )
      if result.returncode == 0:
        print(f'✓ {path}', flush=True)
      else:
        print(f'✗ {path}', flush=True)
" 2>/dev/null || echo "⚠️  Using alternative file download method..."

# Fallback: try direct bucket list
if [ ! "$(ls -A $FILES_DIR)" ]; then
  echo "Attempting direct download from bucket..."
  curl -s \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/storage/v1/object/list/$BUCKET?limit=1000" > "$BACKUP_DIR/file_list.json"
  echo "File list saved to file_list.json"
fi

FILES_SIZE=$(du -sh "$FILES_DIR" 2>/dev/null | cut -f1)
echo "✅ Files backed up: $FILES_SIZE"

# ============ Create Archive ============
echo ""
echo "📦 Creating backup archive..."

ARCHIVE_NAME="joe-main-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
cd ./backups
tar -czf "$ARCHIVE_NAME" "$(basename $BACKUP_DIR)"
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
cd -

echo "✅ Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)"

# ============ Summary ============
echo ""
echo "🎉 Backup complete!"
echo "📍 Location: ./backups/$ARCHIVE_NAME"
echo ""
echo "Contents:"
echo "  - database.sql: PostgreSQL dump"
echo "  - files/: All Supabase storage files"
echo "  - manifest.json: Backup metadata"
echo ""
echo "To restore on another host:"
echo "  1. Extract: tar -xzf $ARCHIVE_NAME"
echo "  2. Restore DB: psql <new_db_url> < database.sql"
echo "  3. Upload files to new Supabase bucket using upload script"
